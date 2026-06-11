let participantId = localStorage.getItem("participantId");

function getConditionFormID(pid) { //条件を決める
  const id = Number(pid);

  if (id >= 1 && id <= 200) 
    learnType = "analog", answerType = "analog";
  else if (id >= 201 && id <= 400) 
    learnType = "analog", answerType = "digital";
  else if (id >= 401 && id <= 600) 
    learnType = "digital", answerType = "analog";
  else if (id >= 601 && id <= 800) 
    learnType = "digital", answerType = "digital";
  return null;
}

const parms = new URLSearchParams(window.location.search);
const pidFromURL = parms.get("pid");

if (pidFromURL) { //URLから参加者IDを取得して条件を決める
  const cond = getConditionFormID(pidFromURL);
  if (cond) {
    window.participantId = pidFromURL;
    window.learnType = cond.learnType;
    window.answerType = cond.answerType;
    window.condition = `${cond.learnType}_learn_${cond.answerType}_answer`;
    console.log("URLから参加者IDを取得:", window.condition);
  }
}

const questions = [
    {
        text: "", correct: "", //ここで実際の問題文と正解を入れる
    },
    {
        text: "", correct: "",
    }, //これを必要な数だけ繰り返す
];

const choicePool = [
    "", //ここで実際の選択肢を入れる
    "", //これも必要な数だけ繰り返す
];

function generateChoices(correctLabel) {
  const choices = [correctLabel]; //正解を入れる
  const incorrectChoices = choicePool.filter(c => c !== correctLabel); //正解以外の選択肢を抽出
  while (choices.length < 4 ){ //選択肢が4つになるまで
    const pick = incorrectChoices[Math.floor(Math.random() * incorrectChoices.length)]; //ランダムに選択肢を選ぶ
    if (!choices.includes(pick)) {
      choices.push(pick);
    }
  }
  return shuffle(choices);
}

const quiz = qquestions.map(q => {
    return {
        text: q.text,
        correct: q.correct,
        choices: generateChoices(q.correct)
    };
});

const quizDiv = document.getElementById("quiz");
const startTimes = {};

function showQuestions() {
  quizDiv.innerHTML = ""; // 初期化
  quiz.forEach((q, index) => {
    startTimes[q.id] = Date.now(); // 各問題の開始時刻を記録
    const div = document.createElement("div");
    div.className = "question-block";
    const choices = generateChoices(q.correct);
    div.innerHTML = `
      <h3>問題 ${index + 1}: ${q.text}</h3>
      ${choices
        .map(
          c => `
        <button class="choice" data-qid="${q.id}" data-value="${c}">
          ${c}
        </button>
      `
        )
        .join("")}
    `;

    quizDiv.appendChild(div);
  });
  setupChoiceHandlers();
}


const results = [];

function setupChoiceHandlers() {
  document.querySelectorAll(".choice").forEach(btn => {
    btn.addEventListener("click", () => {
      const qid = Number(btn.dataset.qid);
      const value = btn.dataset.value;
      const end = Date.now();
      const elapsed = (end - startTimes[qid]) / 1000;
      const question = quiz.find(q => q.id === qid);
      const isCorrect = value === question.correct;
      results.push({
        id: qid,
        text: question.text,
        correctAnswer: question.correct,
        participantAnswer: value,
        correct: isCorrect,
        timeSec: elapsed
      });

      // 同じ問題のボタンを無効化
      btn.closest(".question-block")
         .querySelectorAll("button")
         .forEach(b => (b.disabled = true));
    });
  });
}

let testStart = null;

// クイズ開始イベント
const startButton = document.getElementById("start");
if (startButton) {
  startButton.addEventListener("click", () => {
    testStart = Date.now();
    results.length = 0;  // 前回のデータをリセット
    showQuestions();
  });
}

// 回答終了ボタンのイベントリスナー（1回だけ登録）
const finishButton = document.getElementById("finish");
if (finishButton) {
  finishButton.addEventListener("click", () => {
    alert(`結果数: ${results.length}`);  // 回答数を確認
    const testEnd = Date.now();
    const totalTimeSec = (testEnd - testStart) / 1000;
    const totalCorrect = results.filter(r => r.correct).length;

    const learnType = Math.random() < 0.5 ? "analog" : "digital"; // ここで実験条件を指定
    const answerType = Math.random() < 0.5 ? "analog" : "digital"; // ここで回答形式を指定
    const condition = `${learnType}_Learn__${answerType}_Answer`; // 条件をまとめる
    
    const payload = {
      participantId: participantId,
      learnType: learnType,
      answerType: answerType,
      condition: condition,
      totalTimeSec: totalTimeSec,
      totalCorrect: totalCorrect,
      questions: results,
      timestamp: new Date().toISOString()
    };

    fetch("https://sandbox-dhdw.onrender.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
    .then(res => {
      alert(`送信完了: ${res.status}`);  // レスポンスコード確認
      return res.json();
    })
    .then(data => alert(`返事: ${JSON.stringify(data)}`))
    .catch(err => alert(`エラー: ${err}`));
  });
}