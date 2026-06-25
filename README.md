# Document Extraction Tool DEMO (OCR)

## 🚀 Features
- **OCR & PDF Parsing:** Converts Images and multi-page PDFs to text/markdown using Baidu's Unlimited-OCR.
- **Table Export:** Automatically detects tables in documents and exports them to Excel (`.xlsx`).
- **Structured Data:** Uses Gemini AI to extract specific fields (totals, dates, line items) from receipts and forms into clean JSON.

## 💻 Requirements
- **GPU:** NVIDIA T4 (Select 'T4 GPU' in Colab or 'GPU T4 x2' in Kaggle).
- **Internet:** Required to download models and connect to the Gemini API.

## 🔑 API Key Setup
1. Generate a free API key at [Google AI Studio](https://aistudio.google.com/).
2. **In Google Colab:** Click the **Secrets** (key icon) on the left sidebar and add a secret named `GOOGLE_API_KEY`.
3. **In Kaggle/Local:** You will be prompted to enter the key manually when running the setup cells.

## 📖 How to Use
1. Run all cells in the notebook (`Runtime` -> `Run all`).
2. Scroll to the bottom to find the **gradio.live** public URL.
3. Upload your file to the appropriate tab (**Image**, **PDF**, **Receipt**, or **Form**).
4. Click **Parse** or **Extract** to view the results and download the generated Excel files.
