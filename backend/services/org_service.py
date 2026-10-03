import re
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
import pypdf

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI

from config import UPLOAD_DIR, IMAGE_EXTENSIONS
from database import organizations_db, processed_documents, vector_store, save_organizations
from services.ocr_service import extract_text_from_image


async def ai_detect_organization(filename: str, text_preview: str) -> dict:
    """
    Use AI to analyze a document and suggest which organization and distinct portfolio/folder it belongs to.
    """
    existing_orgs = [
        {
            "id": oid,
            "name": org["name"],
            "description": org.get("description", ""),
            "folders": org.get("folders", [])
        }
        for oid, org in organizations_db["organizations"].items()
        if not org.get("is_system", False)
    ]

    org_list_text = "\n".join([
        f"- ID: {o['id']}, Name: {o['name']}, Existing Folders: {o.get('folders', [])}"
        for o in existing_orgs
    ]) if existing_orgs else "Henüz kayıtlı kurum yok."

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    prompt = f"""Sen akıllı bir gayrimenkul ve portföy arşiv uzmanısın.
Aşağıdaki dokümanı analiz et; ait olduğu kurumu, taşınmaz/lokasyon bazlı PORTFÖY KLASÖRÜNÜ ve etiketlerini belirle.

MEVCUT KURUMLAR VE KLASÖRLERİ:
{org_list_text}

DOKÜMAN ADI: {filename}
DOKÜMAN METNİ ÖZETİ:
{text_preview[:2500]}

KURALLAR:
1. KURUM:
   - Dokümanda geçen kişi/firma isimlerine göre mevcut kurumlardan birini seç ("suggested_org_id") veya yeni kurum adı ver ("suggested_org_name").
2. PORTFÖY / KLASÖR ADLANDIRMA (ÇOK ÖNEMLİ):
   - Her farklı arsa, daire, il/ilçe veya proje (örn. Silivri, Dikili, Kadıköy, Bodrum) AYRI BİR PORTFÖY KLASÖRÜDÜR.
   - Seçilen kurumda önceden bir klasör (örn: "İzmir Dikili") olsa dahi, eğer bu doküman farklı bir taşınmaza (örn. "Silivri Arsa") aitse ASLA eski klasöre ekleme! Mutlaka o yeni taşınmaza özel YENİ bir Klasör Adı öner (örn. "İstanbul Silivri Arsa").
   - Yalnızca bu doküman mevcut klasördeki taşınmazın aynısıysa o klasör adını ver.
3. ETİKETLER:
   - 2-4 adet net Türkçe etiket: ["tapu", "imar", "silivri", "arsa", "sozlesme"] gibi.

Yanıtı kesinlikle bu JSON formatında ver:
{{
  "suggested_org_id": "<eşleşen ID veya null>",
  "suggested_org_name": "<kurum adı>",
  "suggested_folder": "<taşınmaza/lokasyona özel klasör adı>",
  "confidence": "high/medium/low",
  "reasoning": "<kısa açıklama>",
  "suggested_tags": ["etiket1", "etiket2"],
  "doc_type": "contract/proposal/invoice/procedure/report/correspondence/other"
}}
"""

    try:
        result = await llm.ainvoke([HumanMessage(content=prompt)])
        content = result.content.strip()
        if "```" in content:
            content = re.search(r'```(?:json)?\s*(.*?)```', content, re.DOTALL)
            content = content.group(1).strip() if content else "{}"
        return json.loads(content)
    except Exception as e:
        print(f"[ai_detect] Error: {e}")
        return {
            "suggested_org_id": None,
            "suggested_org_name": None,
            "suggested_folder": "",
            "confidence": "low",
            "reasoning": f"AI detection failed: {str(e)}",
            "suggested_tags": [],
            "doc_type": "other",
        }


async def analyze_batch_for_smart_organization(filenames: List[str]) -> dict:
    """Analyze multiple uploaded documents together to identify shared portfolio, clean filenames, and tags."""
    existing_orgs = [
        {"id": oid, "name": org["name"], "description": org.get("description", ""), "folders": org.get("folders", [])}
        for oid, org in organizations_db["organizations"].items()
        if not org.get("is_system", False)
    ]

    files_context = []
    for fname in filenames:
        text = ""
        if fname in processed_documents:
            text = processed_documents[fname].get("text", "")
        if not text:
            file_path = UPLOAD_DIR / fname
            if file_path.exists():
                ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else ""
                if ext == "pdf":
                    try:
                        reader = pypdf.PdfReader(file_path)
                        text = "\n".join(page.extract_text() or "" for page in reader.pages[:3])
                    except: pass
                elif ext in IMAGE_EXTENSIONS:
                    try:
                        text = await extract_text_from_image(file_path)
                    except: pass
                elif ext == "txt":
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            text = f.read()[:2500]
                    except: pass
        files_context.append({
            "filename": fname,
            "preview": text[:2500] if text else "İçerik okunamadı."
        })

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    prompt = f"""Sen üst düzey bir gayrimenkul, portföy ve kurumsal doküman arşiv uzmanısın.
Kullanıcı sisteme dosya(lar) yüklüyor. Amacın KULLANICIYA HİÇBİR MANUEL İŞ BIRAKMADAN tüm dosyaları doğru kuruma, doğru portföy klasörüne, temiz Türkçe dosya isimlerine ve zengin etiketlere otomatik bağlamaktır.

MEVCUT KURUMLAR VE MEVCUT KLASÖRLERİ:
{json.dumps(existing_orgs, ensure_ascii=False, indent=2)}

YÜKLENEN DOSYALARIN METİN ÖZETLERİ ({len(filenames)} adet):
{json.dumps(files_context, ensure_ascii=False, indent=2)}

ANALİZ VE OTOMATİK DÜZENLEME KURALLARI:
1. KURUM EŞLEŞTİRMESİ (ÇOK ÖNEMLİ):
   - Dosya içeriklerindeki kişi isimleri, şirket unvanları, antetler, WhatsApp konuşmacı adları veya imzalara bak.
   - Eğer içerik Mevcut Kurumlar listesindeki bir kurumla (örneğin "Nuran Hanım", "Bassel Group" vb.) uyuşuyorsa veya kısmen geçiyorsa ("Nuran", "Bassel", vb.), "suggested_org_id" alanına o kurumun ID'sini mutlaka yaz.
   - Eğer tamamen yeni bir kurum veya şahıs ise "suggested_org_id": null yap ve "suggested_org_name" alanına temiz kurum adını yaz.

2. PORTFÖY / KLASÖR ADLANDIRMA (ÇOK KRİTİK - TAŞINMAZ / LOKASYON AYRIMI):
   - Her farklı arsa, daire, il/ilçe, mahalle, proje veya ada-parsel AYRI BİR PORTFÖY KLASÖRÜDÜR.
   - DİKKAT: Kurum aynı olsa bile (örneğin "Nuran Hanım"), eğer o kurumun mevcut klasörleri (örn: "İzmir Dikili") ile yüklenen yeni dosyaların lokasyonu/konusu (örn: "Silivri Arsa", "Kadıköy Daire", "Bodrum Villa") FARKLı ise, ASLA eski klasörün adını verme! Mutlaka o yeni taşınmaza özel YENİ BİR KLASÖR ADI OLUŞTUR (örn: "İstanbul Silivri Arsa" veya "Silivri Selimpaşa Portföyü").
   - Yalnızca ve yalnızca yüklenen evraklar mevcut bir klasördeki taşınmazın aynısına aitse o mevcut klasör adını ver.
   - Eğer yeni bir taşınmaz ise, dosyalarda geçen İl / İlçe / Mahalle / Proje ve Gayrimenkul tipini içeren net, şık bir portföy klasör adı üret (örn: "Silivri Arsa Portföyü", "Kadıköy 3+1 Daire").

3. DOSYA İSİMLERİNİ TEMİZLEME:
   - "Ekran Resmi 2026-...", "IMG_4021.PNG", "scan_1.pdf" gibi anlamsız isimleri YASAKLA.
   - Her dosyanın içeriğini tam yansıtan Türkçe, net ve alt çizgili dosya adı üret (örn: "1_Silivri_Tapu_Senedi.png", "2_Silivri_Imar_Krokisi.pdf", "3_Silivri_WhatsApp_Notu.png").

4. ZENGİN OTOMATİK ETİKETLER (Kullanıcı etiketle uğraşmasın):
   - İçeriğe göre 2-4 adet net Türkçe etiket üret: ["tapu", "imar", "silivri", "arsa", "sozlesme", "whatsapp_notu"] gibi.

5. ÖZET:
   - "batch_summary": Yapay zekanın ne tespit ettiğini kullanıcıya 1 cümlede bildiren kibar ve net Türkçe açıklama.

Yanıtı kesinlikle bu JSON şemasında ver:
{{
  "is_portfolio_batch": true/false,
  "suggested_org_id": "<eşleşen kurum ID veya null>",
  "suggested_org_name": "<kurum adı>",
  "suggested_folder": "<taşınmaza/lokasyona özel net portföy/klasör adı>",
  "confidence": "high/medium/low",
  "batch_summary": "<1 cümlelik açıklama>",
  "file_renames": {{
    "orijinal_adi.ext": "1_Temiz_Dosya_Adi.ext"
  }},
  "suggested_tags": ["etiket1", "etiket2", "etiket3"]
}}
"""

    try:
        res = await llm.ainvoke([HumanMessage(content=prompt)])
        content = res.content.strip()
        if "```" in content:
            content = re.search(r'```(?:json)?\s*(.*?)```', content, re.DOTALL)
            content = content.group(1).strip() if content else "{}"
        parsed = json.loads(content)
        return parsed
    except Exception as e:
        print(f"[batch_analyze] Error: {e}")
        return {
            "is_portfolio_batch": len(filenames) > 1,
            "suggested_org_id": None,
            "suggested_org_name": None,
            "suggested_folder": "Yeni Portföy" if len(filenames) > 1 else "",
            "confidence": "low",
            "batch_summary": "Dosyalar toplu olarak hazırlandı.",
            "file_renames": {f: f for f in filenames},
            "suggested_tags": ["portföy"]
        }


def rename_doc_internal(old_name: str, new_name_raw: str) -> str:
    """Rename a document on disk, update processed_documents, Chroma metadata, and organizations_db."""
    global processed_documents
    if not new_name_raw or not new_name_raw.strip():
        return old_name

    ext = old_name.rsplit(".", 1)[-1].lower() if "." in old_name else "txt"
    raw_base = new_name_raw.strip()
    if raw_base.lower().endswith(f".{ext}"):
        raw_base = raw_base[:-len(f".{ext}")]

    clean_base = re.sub(r'[^a-zA-Z0-9_\-çğıöşüÇĞİÖŞÜ\s]', '', raw_base).strip().replace(' ', '_')
    if not clean_base:
        return old_name

    new_filename = f"{clean_base}.{ext}"
    if new_filename == old_name:
        return old_name

    counter = 1
    new_path = UPLOAD_DIR / new_filename
    while new_path.exists() and new_filename != old_name:
        new_filename = f"{clean_base}_{counter}.{ext}"
        new_path = UPLOAD_DIR / new_filename
        counter += 1

    old_path = UPLOAD_DIR / old_name
    if old_path.exists():
        try:
            old_path.rename(new_path)
        except Exception as e:
            print(f"[rename_doc] File rename error: {e}")

    if old_name in processed_documents:
        doc_info = processed_documents.pop(old_name)
        processed_documents[new_filename] = doc_info

    if old_name in organizations_db["document_assignments"]:
        assignment = organizations_db["document_assignments"].pop(old_name)
        organizations_db["document_assignments"][new_filename] = assignment
        save_organizations()

    try:
        data = vector_store.get()
        ids_to_update = []
        updated_metadatas = []
        for doc_id, meta in zip(data.get("ids", []), data.get("metadatas", [])):
            if meta.get("source") == old_name:
                meta["source"] = new_filename
                ids_to_update.append(doc_id)
                updated_metadatas.append(meta)
        if ids_to_update:
            vector_store._collection.update(ids=ids_to_update, metadatas=updated_metadatas)
    except Exception as e:
        print(f"[rename_doc] Vector metadata update warning: {e}")

    return new_filename
