let participantId = localStorage.getItem("participantId");

function getConditionFormID(pid) { //条件を決める
  const id = Number(pid);

  if (id >= 1 && id <= 200) 
    return { learnType: "analog", answerType: "analog" };
  else if (id >= 201 && id <= 400) 
    return { learnType: "analog", answerType: "digital" };
  else if (id >= 401 && id <= 600) 
    return { learnType: "digital", answerType: "analog" };
  else if (id >= 601 && id <= 800) 
    return { learnType: "digital", answerType: "digital" };
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
        <div class="choicebox" data-qid="${q.id}" data-value="${c}">
        <span class="choiceText">${c}</span>
        </div>
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
  document.querySelectorAll(".choicebox ").forEach(btn => {
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
    if (window.answerType === "analog") { //アナログ回答の場合；問題を出さない
      document.getElementById("quiz").innerHTML = ""; //問題を出さない
      document.getElementById("finish").style.display = "block"; // 回答終了ボタンを表示
    }
    if (window.answerType === "digital") { //デジタル回答の場合；問題を出す
      testStart = Date.now(); //テスト開始時刻を記録
      results.length = 0; //結果を初期化
      showQuestions();
      document.getElementById("finish").style.display = "block"; // 回答終了ボタンを表示
    }
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
    const payload = {
      participantId: window.participantId,
      learnType: window.learnType,
      answerType: window.answerType,
      condition: window.condition,
      totalTimeSec: totalTimeSec,
      totalCorrect: totalCorrect,
      questions: results,
      timestamp: new Date().toISOString()
    };

    fetch("https://prod-h9qw.onrender.com/submit", {
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