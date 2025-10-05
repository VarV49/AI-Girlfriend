from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys

# NOTE: The google-generativeai package must be installed (see requirements.txt).
# Do NOT hard-code your API key here. Set GEMINI_API_KEY in your environment.
try:
    import google.generativeai as genai
except Exception as e:
    print("Missing dependency 'google-generativeai'. Install with: pip install google-generativeai", file=sys.stderr)
    raise

app = Flask(__name__)
CORS(app)

# Require environment variable; fail fast if missing
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("ERROR: GEMINI_API_KEY environment variable is not set.\nSet it and restart the server.\nOn mac/linux: export GEMINI_API_KEY=your_key\nOn Windows (PowerShell): setx GEMINI_API_KEY \"your_key\" (then restart your shell)", file=sys.stderr)
    # do not exit automatically here so developer can see message when importing, but subsequent calls will fail clearly
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('models/gemini-2.5-flash-preview-05-20')


@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json(force=True, silent=True) or {}
    prompt = data.get('prompt') or data.get('message') or ''
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    try:
        # The SDK returns a nested structure; be defensive when extracting text
        response = model.generate_content(prompt)
        # Try multiple safe extraction paths
        text = None
        # new SDKs often have response.candidates -> list of Candidate with content parts
        try:
            text = response.candidates[0].content[0].text
        except Exception:
            try:
                # alternate path
                text = response.candidates[0].content.parts[0].text
            except Exception:
                try:
                    # older simple .text
                    text = response.text
                except Exception:
                    text = None
        if not text:
            # Fallback: stringify response for debugging
            return jsonify({"error": "No text in Gemini response", "raw": str(response)}), 500
        return jsonify({"response": text})
    except Exception as e:
        # Provide clear error info for debugging (do NOT include your API key anywhere)
        print("Exception when calling Gemini:", str(e), file=sys.stderr)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Default host=127.0.0.1, port=5000
    print("Starting backend on http://127.0.0.1:5000 — make sure GEMINI_API_KEY is set in your environment.")
    app.run(debug=True, port=5000)
