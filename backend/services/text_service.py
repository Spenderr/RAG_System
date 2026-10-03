import re
from typing import List, Tuple, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter


def clean_text(text: str) -> str:
    """Strip Wikipedia-style references, external links, citations."""
    stop_headers = [
        "\nReferences\n", "\nExternal links\n",
        "\nFurther reading\n", "\nSee also\n", "\nNotes\n",
    ]
    for stop in stop_headers:
        if stop in text:
            text = text.split(stop)[0]
    text = re.sub(r'\[(?:\d+|[a-z]|note\s*\d+)\]', '', text)
    return text


def normalize_text_to_paragraphs(raw_text: str) -> str:
    """
    Cleans and repairs document/PDF text:
    - Joins hyphenated words broken across lines (e.g. 'packag-\ning' -> 'packaging')
    - Merges soft newlines within sentences so sentences are not cut in half
    - Preserves true paragraph breaks and list items
    """
    text = clean_text(raw_text)

    # 1. Fix hyphenation at line breaks
    text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', text)

    # 2. Normalize carriage returns
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # 3. Merge soft line wraps: if a line does not end with sentence terminator, join with next line
    lines = text.split('\n')
    paragraphs = []
    current_para = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_para:
                paragraphs.append(' '.join(current_para))
                current_para = []
            continue

        # Check if line looks like a title heading or bullet
        is_heading = (
            bool(re.match(r'^(?:(?:\d{1,2}\.){1,3}|\d{1,2}\))\s+[A-ZÇĞİÖŞÜ0-9]', stripped)) or
            bool(re.match(r'^(?:ARTICLE|SECTION|MADDE|BÖLÜM|CLAUSE|RULE)\s+\d+', stripped, re.IGNORECASE)) or
            bool(re.match(r'^[A-Z0-9\s–—\-\(\)\/\:\.]{6,80}$', stripped) and len(stripped.split()) >= 2)
        )
        is_bullet = bool(re.match(r'^(?:[\-\*•]|\([a-zA-Z\d]+\))\s+', stripped))

        if (is_heading or is_bullet) and current_para:
            paragraphs.append(' '.join(current_para))
            current_para = []

        if is_heading:
            paragraphs.append(stripped)
        else:
            current_para.append(stripped)
            if stripped.endswith(('.', ':', '!', '?')) and len(stripped) > 40:
                paragraphs.append(' '.join(current_para))
                current_para = []

    if current_para:
        paragraphs.append(' '.join(current_para))

    return '\n\n'.join(p for p in paragraphs if p.strip())


def is_section_heading(line: str) -> bool:
    """Detect if a line represents a section title, article, or numbered heading."""
    stripped = line.strip()
    if not stripped or len(stripped) > 130:
        return False

    # 1. Numbered headings: '1. ', '1.2 ', '1.2.3 ', '4. Irrevocable Corporate...'
    if re.match(r'^(?:(?:\d{1,2}\.){1,3}|\d{1,2}\))\s+[A-ZÇĞİÖŞÜ].+', stripped):
        return True

    # 2. Formal legal / procedure headings: 'ARTICLE 5', 'SECTION 2', 'MADDE 3', 'CLAUSE 4'
    if re.match(r'^(?:ARTICLE|SECTION|MADDE|BÖLÜM|CLAUSE|RULE)\s+\d+', stripped, re.IGNORECASE):
        return True

    # 3. All caps titles (between 6 and 90 chars, no terminal period/comma)
    if re.match(r'^[A-Z0-9\s–—\-\(\)\/\:\.]{6,90}$', stripped):
        if not re.search(r'\b(?:No\:\d+|Plaza|Avenue|Street|Tel|Email|www\.)', stripped, re.IGNORECASE):
            words = stripped.split()
            if len(words) >= 2:
                return True

    return False


def chunk_by_sections_or_paragraphs(full_text_with_pages: List[Tuple[int, str]], max_chunk_size: int = 850, overlap: int = 120):
    """
    Title/Section-aware chunking:
    - Automatically discovers document headings ('1. Title', 'ARTICLE 5', etc.)
    - Groups text by titles so every section stays together with its heading.
    - If a section exceeds max_chunk_size, splits smoothly at sentence boundaries while keeping the title header.
    - Preserves exact page numbers for each chunk.
    """
    raw_sections = []
    current_title = "Introduction"
    current_lines = []
    current_page = 1

    for page_num, page_text in full_text_with_pages:
        cleaned_page = re.sub(r'BASSEL[\s\S]*?No:2, Şişli/İstanbul', '', page_text)
        cleaned_page = normalize_text_to_paragraphs(cleaned_page)

        for line in cleaned_page.split('\n'):
            line_s = line.strip()
            if not line_s:
                continue

            if is_section_heading(line_s):
                if current_lines:
                    raw_sections.append({
                        "title": current_title,
                        "text": '\n\n'.join(current_lines),
                        "page": current_page,
                    })
                    current_lines = []
                current_title = line_s
                current_page = page_num
            else:
                current_lines.append(line_s)
                current_page = page_num

    if current_lines:
        raw_sections.append({
            "title": current_title,
            "text": '\n\n'.join(current_lines),
            "page": current_page,
        })

    has_structure = len(raw_sections) >= 2 and any(s["title"] != "Introduction" for s in raw_sections)

    sentence_splitter = RecursiveCharacterTextSplitter(
        chunk_size=max_chunk_size,
        chunk_overlap=overlap,
        keep_separator=True,
        separators=["\n\n", ".\n", ".\s+", ". ", "? ", "! ", "; ", "\n", " "],
    )

    final_chunks = []
    chunk_details = []

    if has_structure:
        chunk_idx = 0
        for sec in raw_sections:
            sec_title = sec["title"]
            sec_text = sec["text"].strip()
            sec_page = sec["page"]

            if not sec_text:
                continue

            titled_text = f"## {sec_title}\n{sec_text}"

            if len(titled_text) <= max_chunk_size + 150:
                final_chunks.append(titled_text)
                chunk_details.append({
                    "text": titled_text,
                    "title": sec_title,
                    "page": sec_page,
                    "index": chunk_idx,
                })
                chunk_idx += 1
            else:
                sub_parts = sentence_splitter.split_text(sec_text)
                for part_i, part in enumerate(sub_parts):
                    part_title = f"{sec_title} (Part {part_i + 1})" if len(sub_parts) > 1 else sec_title
                    sub_titled = f"## {part_title}\n{part.strip()}"
                    final_chunks.append(sub_titled)
                    chunk_details.append({
                        "text": sub_titled,
                        "title": part_title,
                        "page": sec_page,
                        "index": chunk_idx,
                    })
                    chunk_idx += 1
    else:
        all_text = '\n\n'.join(p[1] for p in full_text_with_pages)
        parts = sentence_splitter.split_text(normalize_text_to_paragraphs(all_text))
        for idx, p in enumerate(parts):
            final_chunks.append(p)
            chunk_details.append({
                "text": p,
                "title": f"Paragraph #{idx + 1}",
                "page": 1,
                "index": idx,
            })

    return final_chunks, chunk_details


def get_accurate_page_for_chunk(chunk_text: str, page_texts: List[Tuple[int, str]]) -> int:
    """
    Given a chunk text, finds the exact page number (1-indexed) in page_texts [(1, '...'), (2, '...'), ...]
    where this chunk content appears.
    """
    clean_chunk = re.sub(r'^##\s+[^\n]+\n*', '', chunk_text).strip()
    if not clean_chunk:
        clean_chunk = chunk_text.strip()

    clean_chunk_lower = clean_text(clean_chunk).lower()
    norm_chunk = ' '.join(clean_chunk_lower.split())

    snippets = [
        norm_chunk[:60] if len(norm_chunk) >= 60 else norm_chunk,
        norm_chunk[len(norm_chunk)//2 : len(norm_chunk)//2 + 60] if len(norm_chunk) >= 120 else '',
        norm_chunk[-60:] if len(norm_chunk) >= 60 else '',
    ]

    for snippet in snippets:
        if not snippet or len(snippet) < 15:
            continue
        for page_num, p_text in page_texts:
            norm_p_text = ' '.join(clean_text(p_text).lower().split())
            if snippet in norm_p_text:
                return page_num

    words = [w for w in norm_chunk.split() if len(w) > 4]
    if words:
        best_page = 1
        max_hits = 0
        for page_num, p_text in page_texts:
            norm_p_text = clean_text(p_text).lower()
            hits = sum(1 for w in words if w in norm_p_text)
            if hits > max_hits:
                max_hits = hits
                best_page = page_num
        if max_hits >= 2:
            return best_page

    return 1
