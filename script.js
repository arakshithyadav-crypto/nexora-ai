```javascript
// =====================================
// NEXORA AI — ONLINE VERSION
// =====================================

// =====================================
// AI DOUBT SOLVER
// =====================================

async function solveDoubt() {

    const questionInput =
        document.getElementById("doubtQuestion");

    const subjectInput =
        document.getElementById("subject");

    const answerBox =
        document.getElementById("doubtAnswer");

    if (!questionInput || !answerBox) {
        console.error("NEXORA: Required HTML elements not found.");
        return;
    }

    const question =
        questionInput.value.trim();

    const subject =
        subjectInput
            ? subjectInput.value
            : "General";

    if (!question) {

        answerBox.innerHTML = `
            <div class="answer-title">
                ⚠️ NEXORA AI
            </div>

            <p>
                Please enter a question first.
            </p>
        `;

        return;
    }

    answerBox.innerHTML = `
        <div class="answer-title">
            🤖 NEXORA AI
        </div>

        <div
            id="thinkingOrb"
            class="thinking-orb">
        </div>

        <div id="streamedAnswer"></div>
    `;

    const output =
        document.getElementById("streamedAnswer");

    try {

        console.log("NEXORA: Sending question...");

        const response = await fetch(
            "/api/ask",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    question:
`Subject: ${subject}

Student question:
${question}`
                })
            }
        );

        console.log(
            "NEXORA: Response status:",
            response.status
        );

        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `Server error ${response.status}: ${errorText}`
            );
        }

        if (!response.body) {
            throw new Error(
                "No response stream received."
            );
        }

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder();

        let answer = "";

        while (true) {

            const {
                value,
                done
            } = await reader.read();

            if (done) {
                break;
            }

            answer += decoder.decode(
                value,
                {
                    stream: true
                }
            );

            output.innerHTML =
                formatAnswer(answer);
        }

        answer += decoder.decode();

        output.innerHTML =
            formatAnswer(answer);

        const orb =
            document.getElementById(
                "thinkingOrb"
            );

        if (orb) {
            orb.remove();
        }

        console.log(
            "NEXORA: AI response completed."
        );

    } catch (error) {

        console.error(
            "NEXORA AI ERROR:",
            error
        );

        const orb =
            document.getElementById(
                "thinkingOrb"
            );

        if (orb) {
            orb.remove();
        }

        output.innerHTML = `
            ❌ NEXORA AI could not connect
            to the AI service.

            <br><br>

            <small>
                Please try again in a few seconds.
            </small>
        `;
    }
}


// =====================================
// QUIZ VARIABLES
// =====================================

let quizQuestions = [];

let currentQuestion = 0;

let quizScore = 0;

let answerSelected = false;

let progressTimer = null;

let fakeProgress = 0;


// =====================================
// GENERATE QUIZ
// =====================================

async function generateQuiz() {

    const topic =
        document
            .getElementById("quizTopic")
            .value
            .trim();

    const difficulty =
        document
            .getElementById("quizDifficulty")
            .value;

    const number =
        document
            .getElementById("quizNumber")
            .value;

    const quizBox =
        document.getElementById("quizBox");

    if (!topic) {

        quizBox.innerHTML =
            "⚠️ Please enter a topic first.";

        return;
    }

    quizBox.innerHTML = `

        <div class="quiz-loading">

            <div class="thinking-orb"></div>

            <h3>
                🤖 Creating your quiz...
            </h3>

            <div class="progress-container">

                <div
                    id="quizProgressBar"
                    class="quiz-progress-bar">
                </div>

            </div>

            <div
                id="quizProgressText"
                class="quiz-progress-text">

                0%

            </div>

            <p id="quizLoadingMessage">

                Understanding your topic...

            </p>

        </div>
    `;

    fakeProgress = 0;

    if (progressTimer) {
        clearInterval(progressTimer);
    }

    progressTimer =
        setInterval(() => {

            if (fakeProgress < 90) {

                fakeProgress +=
                    Math.floor(
                        Math.random() * 4
                    ) + 1;

                if (fakeProgress > 90) {
                    fakeProgress = 90;
                }

                updateQuizProgress(
                    fakeProgress
                );
            }

        }, 500);

    const prompt = `

Create exactly ${number}
multiple-choice questions.

Topic:
${topic}

Difficulty:
${difficulty}

Return ONLY valid JSON.

Use exactly this format:

{
  "questions": [
    {
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "answer": 0,
      "explanation": "One short simple sentence explaining the answer."
    }
  ]
}

Rules:

- Create exactly ${number} questions.
- Exactly 4 options per question.
- answer must be 0, 1, 2, or 3.
- Every question needs an explanation.
- Keep explanations short.
- Return ONLY JSON.
- No markdown.
- No text outside JSON.
`;

    try {

        const response =
            await fetch(
                "/api/quiz",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        question: prompt
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Quiz server error: ${response.status}`
            );
        }

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder();

        let result = "";

        while (true) {

            const {
                value,
                done
            } = await reader.read();

            if (done) {
                break;
            }

            result += decoder.decode(
                value,
                {
                    stream: true
                }
            );
        }

        result += decoder.decode();

        clearInterval(
            progressTimer
        );

        updateQuizProgress(
            100,
            "Quiz ready! 🎯"
        );

        result =
            result
                .replace(
                    /```json/g,
                    ""
                )
                .replace(
                    /```/g,
                    ""
                )
                .trim();

        const firstBrace =
            result.indexOf("{");

        const lastBrace =
            result.lastIndexOf("}");

        if (
            firstBrace === -1 ||
            lastBrace === -1
        ) {
            throw new Error(
                "AI did not return valid JSON"
            );
        }

        result =
            result.substring(
                firstBrace,
                lastBrace + 1
            );

        const quizData =
            JSON.parse(result);

        if (
            !quizData.questions ||
            !Array.isArray(
                quizData.questions
            )
        ) {
            throw new Error(
                "Invalid quiz format"
            );
        }

        quizQuestions =
            quizData.questions;

        currentQuestion = 0;

        quizScore = 0;

        answerSelected = false;

        setTimeout(
            showQuizQuestion,
            500
        );

    } catch (error) {

        clearInterval(
            progressTimer
        );

        console.error(
            "NEXORA QUIZ ERROR:",
            error
        );

        quizBox.innerHTML = `

            <div class="quiz-wrong">

                ❌ NEXORA couldn't create
                the quiz.

            </div>

            <p>
                Please try again.
            </p>
        `;
    }
}


// =====================================
// UPDATE PROGRESS
// =====================================

function updateQuizProgress(
    percent,
    message
) {

    const bar =
        document.getElementById(
            "quizProgressBar"
        );

    const text =
        document.getElementById(
            "quizProgressText"
        );

    const loadingMessage =
        document.getElementById(
            "quizLoadingMessage"
        );

    if (bar) {
        bar.style.width =
            percent + "%";
    }

    if (text) {
        text.textContent =
            percent + "%";
    }

    if (loadingMessage) {
        loadingMessage.textContent =
            message ||
            getQuizLoadingMessage(
                percent
            );
    }
}


// =====================================
// PROGRESS MESSAGES
// =====================================

function getQuizLoadingMessage(
    percent
) {

    if (percent < 20) {
        return "Understanding your topic...";
    }

    if (percent < 40) {
        return "Creating questions...";
    }

    if (percent < 60) {
        return "Building answer options...";
    }

    if (percent < 80) {
        return "Adding explanations...";
    }

    return "Finalizing your quiz...";
}


// =====================================
// SHOW QUESTION
// =====================================

function showQuizQuestion() {

    const quizBox =
        document.getElementById(
            "quizBox"
        );

    if (
        currentQuestion >=
        quizQuestions.length
    ) {

        showQuizResult();

        return;
    }

    answerSelected = false;

    const question =
        quizQuestions[
            currentQuestion
        ];

    if (
        !question ||
        !Array.isArray(
            question.options
        ) ||
        question.options.length !== 4 ||
        typeof question.answer !== "number"
    ) {

        quizBox.innerHTML = `

            <div class="quiz-wrong">

                ❌ This quiz question
                was generated incorrectly.

            </div>

            <button
                class="next-question"
                onclick="generateQuiz()"
            >
                🔄 Generate Again
            </button>
        `;

        return;
    }

    let html = `

        <div class="quiz-progress">

            Question
            ${currentQuestion + 1}
            of
            ${quizQuestions.length}

        </div>

        <h3 class="quiz-question">

            ${escapeHTML(
                question.question
            )}

        </h3>

        <div class="quiz-options">
    `;

    question.options.forEach(
        (option, index) => {

            html += `

                <button
                    class="quiz-option"
                    onclick="selectAnswer(${index})"
                >

                    <span
                        class="option-letter"
                    >
                        ${String.fromCharCode(
                            65 + index
                        )}
                    </span>

                    ${escapeHTML(
                        option
                    )}

                </button>
            `;
        }
    );

    html += `

        </div>

        <div id="quizFeedback"></div>
    `;

    quizBox.innerHTML =
        html;
}


// =====================================
// SELECT ANSWER
// =====================================

function selectAnswer(
    selectedIndex
) {

    if (answerSelected) {
        return;
    }

    answerSelected = true;

    const question =
        quizQuestions[
            currentQuestion
        ];

    const options =
        document.querySelectorAll(
            ".quiz-option"
        );

    const feedback =
        document.getElementById(
            "quizFeedback"
        );

    options.forEach(
        button => {
            button.disabled = true;
        }
    );

    if (
        selectedIndex ===
        question.answer
    ) {

        quizScore++;

        options[selectedIndex]
            .classList.add(
                "correct"
            );

        playQuizSound(
            "correct"
        );

        feedback.innerHTML = `

            <div class="quiz-correct">
                ✅ Correct!
            </div>

            <div class="quiz-explanation">

                <strong>
                    💡 Explanation
                </strong>

                <p>
                    ${escapeHTML(
                        question.explanation ||
                        "This is the correct answer."
                    )}
                </p>

            </div>

            <button
                class="next-question"
                onclick="nextQuestion()"
            >
                Next →
            </button>
        `;
    }

    else {

        options[selectedIndex]
            .classList.add(
                "wrong"
            );

        options[
            question.answer
        ]
            .classList.add(
                "correct"
            );

        playQuizSound(
            "wrong"
        );

        feedback.innerHTML = `

            <div class="quiz-wrong">
                ❌ Incorrect!
            </div>

            <div class="correct-answer">

                Correct answer:

                <strong>
                    ${escapeHTML(
                        question.options[
                            question.answer
                        ]
                    )}
                </strong>

            </div>

            <div class="quiz-explanation">

                <strong>
                    💡 Explanation
                </strong>

                <p>
                    ${escapeHTML(
                        question.explanation ||
                        "This is why the correct answer is correct."
                    )}
                </p>

            </div>

            <button
                class="next-question"
                onclick="nextQuestion()"
            >
                Next →
            </button>
        `;
    }
}


// =====================================
// NEXT QUESTION
// =====================================

function nextQuestion() {

    currentQuestion++;

    showQuizQuestion();
}


// =====================================
// QUIZ SOUND
// =====================================

function playQuizSound(type) {

    const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!AudioContext) {
        return;
    }

    const audio =
        new AudioContext();

    const oscillator =
        audio.createOscillator();

    const gain =
        audio.createGain();

    oscillator.type =
        "sine";

    if (type === "correct") {

        oscillator.frequency.setValueAtTime(
            523,
            audio.currentTime
        );

        oscillator.frequency.exponentialRampToValueAtTime(
            784,
            audio.currentTime + 0.15
        );

    } else {

        oscillator.frequency.setValueAtTime(
            220,
            audio.currentTime
        );

        oscillator.frequency.exponentialRampToValueAtTime(
            120,
            audio.currentTime + 0.2
        );
    }

    gain.gain.setValueAtTime(
        0.15,
        audio.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime +
        (
            type === "correct"
                ? 0.35
                : 0.3
        )
    );

    oscillator.connect(gain);

    gain.connect(
        audio.destination
    );

    oscillator.start();

    oscillator.stop(
    audio.currentTime +
    (
        type === "correct"
            ? 0.35
            : 0.3
    )
);

}