```markdown
# Structured Document Extraction Pipeline (Unlimited-OCR + Gemini)

This project provides a complete pipeline for processing unstructured documents (PDFs, Images) into structured formats (Excel, JSON) using state-of-the-art OCR and Generative AI.

## 🚀 Features
- **OCR Engine:** Uses `baidu/Unlimited-OCR` via Hugging Face Transformers for high-accuracy text and table detection.
- **Table Extraction:** Automatically converts Markdown/HTML tables detected in documents into multi-sheet Excel files.
- **Structured Intelligence:** Leverages **Google Gemini 1.5/2.5 Flash** to extract specific fields (Vendor, Date, Totals, Line Items) from receipts and forms into validated JSON.
- **User Interface:** Built with Gradio for a seamless web-based experience (supports both single images and multi-page PDFs).

## 🛠️ Setup Instructions

### 1. Requirements
- **GPU:** NVIDIA T4 or better (recommended).
- **Python:** 3.10+

### 2. API Configuration
This pipeline uses Google Gemini for the structured extraction phase. You must provide a Google AI Studio API Key.
- **Colab:** Add your key to the 'Secrets' tab (🔑) as `GOOGLE_API_KEY`.
- **Local/Kaggle:** You will be prompted to enter the key when running the initialization cell.

### 3. Usage
1. **Run the Notebook:** Execute all cells in order.
2. **Access the UI:** Click the `gradio.live` link generated at the end of the notebook.
3. **Extraction Modes:**
   - **Image/PDF Tab:** General OCR and Table-to-Excel conversion.
   - **Receipt Tab:** Specialized for financial documents (extracts line items).
   - **Form/Invoice Tab:** Extract arbitrary fields using natural language instructions.

## 📝 Technical Details
- **OCR:** Transformers-based inference with fallback to `fp16` if `bf16` is unsupported by the hardware.
- **Schema Validation:** Uses `Pydantic` to ensure LLM outputs strictly follow the defined JSON structure.
- **Async Handling:** The Gradio app is optimized with `.queue()` to handle long-running OCR tasks without timing out.

## 👥 Team
Feel free to open an issue or reach out if you encounter any routing errors (like 404s) or need custom field extraction added to the schema.
```
