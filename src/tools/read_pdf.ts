import pdfparse

def read_pdf(url):
    response = requests.get(url)
    if response.status_code == 200:
        pdf_data = response.content
        text = pdfparse.extract_text(pdf_data)
        return text
    else:
        return None
