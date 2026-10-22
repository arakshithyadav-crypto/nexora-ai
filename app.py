from flask import Flask, request, jsonify, send_from_directory, Response
import requests
import os
import json

app = Flask(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

GEMINI_MODEL = os.environ.get(
    "GEMINI_MODEL",
    "gemini-2.5-flash"
)


@app.route("/")
def home():
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def files(filename):
    return send_from_directory(".", filename)


def ask_gemini(prompt):

    if not GEMINI_API_KEY:
        raise Exception(
            "GEMINI_API_KEY is missing."
        )

    url = (
        "https://generativelanguage.googleapis.com"
        f"/v1beta/models/{GEMINI_MODEL}:generateContent"
        f"?key={GEMINI_API_KEY}"
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

        timeout=120
    )

    response.raise_for_status()

    result = response.json()

    candidates = result.get(
        "candidates",
        []
    )

    if not candidates:
        raise Exception(
            "Gemini returned no answer."
        )

    parts = candidates[0] \
        .get("content", {}) \
        .get("parts", [])

    answer = ""

    for part in parts:
        text = part.get("text", "")

        if text:
            answer += text

    if not answer:
        raise Exception(
            "Gemini returned an empty answer."
        )

    return answer


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

        answer = ask_gemini(prompt)

        return Response(
            answer,
            content_type="text/plain; charset=utf-8"
        )

    except Exception as error:

        print(
            "DOUBT ERROR:",
            error
        )

        return Response(
            "❌ NEXORA AI could not connect "
            "to the AI service.",
            content_type="text/plain; charset=utf-8"
        )


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

    try:

        answer = ask_gemini(prompt)

        return Response(
            answer,
            content_type="text/plain; charset=utf-8"
        )

    except Exception as error:

        print(
            "QUIZ ERROR:",
            error
        )

        return Response(
            "❌ Quiz generation failed.",
            content_type="text/plain; charset=utf-8"
        )


if __name__ == "__main__":

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