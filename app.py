from flask import Flask, request, jsonify, send_from_directory, Response
import requests
import os
import json

app = Flask(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# We will set this in Render later.
GEMINI_MODEL = os.environ.get(
    "GEMINI_MODEL",
    "gemini-2.5-flash"
)


# =====================================
# WEBSITE
# =====================================

@app.route("/")
def home():
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def files(filename):
    return send_from_directory(".", filename)


# =====================================
# GEMINI
# =====================================

def ask_gemini(prompt):

    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY is missing.")

    url = (
        "https://generativelanguage.googleapis.com"
        f"/v1beta/models/{GEMINI_MODEL}:streamGenerateContent"
        f"?alt=sse&key={GEMINI_API_KEY}"
    )

    response = requests.post(
        url,

        headers={
            "Content-Type": "application/json"
        },

        json={
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],

            "generationConfig": {
                "temperature": 0.3
            }
        },

        stream=True,
        timeout=120
    )

    response.raise_for_status()

    for line in response.iter_lines(
        decode_unicode=True
    ):

        if not line:
            continue

        if line.startswith("data:"):

            data = line[5:].strip()

            try:

                result = json.loads(data)

                candidates = result.get(
                    "candidates",
                    []
                )

                if not candidates:
                    continue

                content = candidates[0].get(
                    "content",
                    {}
                )

                parts = content.get(
                    "parts",
                    []
                )

                for part in parts:

                    text = part.get(
                        "text",
                        ""
                    )

                    if text:
                        yield text

            except json.JSONDecodeError:
                continue


# =====================================
# DOUBT SOLVER
# =====================================

@app.route("/api/ask", methods=["POST"])
def ask_ai():

    data = request.get_json() or {}

    question = data.get(
        "question",
        ""
    ).strip()

    if not question:

        return jsonify({
            "error": "Question is empty"
        }), 400

    def generate():

        try:

            prompt = f"""
You are NEXORA AI, an educational AI assistant.

Help the student understand the answer clearly.

Use simple language.

Explain step-by-step when useful.

Do not make the answer unnecessarily complicated.

Student question:

{question}
"""

            for text in ask_gemini(prompt):
                yield text

        except Exception as error:

            print(
                "DOUBT ERROR:",
                error
            )

            yield (
                "\n\n❌ NEXORA AI could not "
                "connect to the AI service."
            )

    return Response(
        generate(),
        content_type="text/plain; charset=utf-8"
    )


# =====================================
# QUIZ GENERATOR
# =====================================

@app.route("/api/quiz", methods=["POST"])
def quiz_ai():

    data = request.get_json() or {}

    prompt = data.get(
        "question",
        ""
    ).strip()

    if not prompt:

        return jsonify({
            "error": "Quiz prompt is empty"
        }), 400

    def generate():

        try:

            for text in ask_gemini(prompt):
                yield text

        except Exception as error:

            print(
                "QUIZ ERROR:",
                error
            )

            yield (
                "\n\n❌ Quiz generation failed."
            )

    return Response(
        generate(),
        content_type="text/plain; charset=utf-8"
    )


# =====================================
# START
# =====================================

if __name__ == "__main__":

    print("")
    print("=====================================")
    print("       NEXORA AI ONLINE")
    print("=====================================")
    print("")

    app.run(
        host="0.0.0.0",
        port=int(
            os.environ.get(
                "PORT",
                5000
            )
        ),
        debug=False
    )