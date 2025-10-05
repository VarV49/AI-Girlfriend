from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os

app = Flask(__name__)
CORS(app) 

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", "AIzaSyBmpxLZOW7UD6LxcPvf4Lkb_mzqAXhaz0A"))
model = genai.GenerativeModel('gemini-pro')

@app.route('/chat', methods=['POST'])
def chat():
    user_data = request.json
    prompt = user_data.get('prompt')

    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    try:
        response = model.generate_content(prompt)
        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
 
    app.run(debug=True, port=5000)