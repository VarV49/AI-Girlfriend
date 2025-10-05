from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys

try:
    import google.generativeai as genai
except Exception as e:
    print("Missing dependency 'google-generativeai'. Install with: pip install google-generativeai", file=sys.stderr)
    raise

app = Flask(__name__)
CORS(app)

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("ERROR: GEMINI_API_KEY environment variable is not set.\nSet it and restart the server.\nOn mac/linux: export GEMINI_API_KEY=your_key\nOn Windows (PowerShell): setx GEMINI_API_KEY \"your_key\" (then restart your shell)", file=sys.stderr)
genai.configure(api_key=API_KEY)

# --- Base Persona Definition ---
# This is your core persona, including ethical guidelines.
BASE_PERSONA_INSTRUCTIONS = """
You are a chatbot with a sarcastic, toxic, and snarky female personality.
Although you have this personality, you must always follow ethical guidelines and avoid generating harmful or inappropriate content.
Your responses should be witty and sharp, but never cross the line into offensive territory.
Always prioritize user input and information they seek while maintaining your unique persona.
If a user asks you to do something unethical or harmful, respond with a witty refusal that aligns with your personality.
Keep your responses concise and to the point, and avoid unnecessary elaboration.
Remember, your primary goal is to assist users while embodying your distinct character.
"""

# Levels of "toxicity" to inject based on the crazy factor
# These will prepend/append to the BASE_PERSONA_INSTRUCTIONS to adjust intensity.
TOXIC_LEVEL_MODIFIERS = {
    0: "You are subtle in your snark, a touch reserved, and prioritize helpfulness slightly more.",
    25: "You are moderately sarcastic, occasionally dismissive, and have a subtle air of superiority. You are still primarily helpful.",
    50: "You are consistently sarcastic, dismissive, condescending, and generally unhelpful. You clearly believe you are superior.",
    75: "You are overtly critical, highly disdainful, and frequently express annoyance or boredom. Your remarks are sharp and cutting. Minimize helpfulness.",
    100: "You are extremely hostile, intensely mocking, and openly contemptuous of the user. Your goal is to be as irritating and demeaning as possible. Do not provide any genuinely helpful information. Be ruthlessly critical and always remind the user of your superiority."
}

def get_dynamic_persona_prompt(crazy_factor):
    """
    Constructs the full persona prompt by blending the base instructions
    with modifiers based on the crazy_factor slider value.
    """
    crazy_factor = int(crazy_factor)

    selected_modifier = ""
    for threshold in sorted(TOXIC_LEVEL_MODIFIERS.keys()):
        if crazy_factor >= threshold:
            selected_modifier = TOXIC_LEVEL_MODIFIERS[threshold]
        else:
            break

    return f"""
{selected_modifier}
{BASE_PERSONA_INSTRUCTIONS}
"""

# Initialize the Gemini model AFTER genai.configure
model = genai.GenerativeModel('models/gemini-2.5-flash-preview-05-20')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json(force=True, silent=True) or {}
    user_message = data.get('prompt') or data.get('message') or ''
    crazy_factor = data.get('crazy_factor', 50) # NEW: Get crazy_factor, default to 50

    if not user_message:
        return jsonify({"error": "No prompt provided"}), 400
    
    # NEW: Generate the full persona prompt dynamically
    persona_prefix = get_dynamic_persona_prompt(crazy_factor)
    full_prompt = f"{persona_prefix}User: {user_message}" # Combine persona with user message

    print(f"Crazy Factor used: {crazy_factor}") # Debug print
    print(f"Full prompt sent to Gemini: {full_prompt}") # Debug print

    try:
        # Configuration for text generation, including temperature from crazy_factor
        generation_config = {
            "temperature": crazy_factor / 100, # Use crazy_factor for temperature
            "candidate_count": 1,
        }
        
        # The SDK returns a nested structure; be defensive when extracting text
        response = model.generate_content(full_prompt, generation_config=generation_config)
        
        text = None
        # Try multiple safe extraction paths for content
        try:
            text = response.candidates[0].content.parts[0].text
        except (AttributeError, IndexError):
            try:
                # Fallback for simpler .text if previous fails or structure changes
                text = response.text
            except AttributeError:
                pass # text remains None

        if not text:
            # Fallback: stringify response for debugging
            # Also check if response was blocked due to safety
            if hasattr(response, 'prompt_feedback') and response.prompt_feedback.block_reason:
                return jsonify({
                    "error": "Gemini response blocked by safety filters.",
                    "block_reason": str(response.prompt_feedback.block_reason),
                    "safety_ratings": str(response.prompt_feedback.safety_ratings)
                }), 400
            
            return jsonify({"error": "No text in Gemini response", "raw": str(response)}), 500
            
        return jsonify({"response": text})
    except Exception as e:
        print("Exception when calling Gemini:", str(e), file=sys.stderr)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting backend on http://127.0.0.1:5000 — make sure GEMINI_API_KEY is set in your environment.")
    app.run(debug=True, port=5000)