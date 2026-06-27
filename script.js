let participantId = localStorage.getItem("participantId") || null;
let learnType = null; // 修正: undefined 参照を防ぐための初期値
let answerType = null; // 修正: undefined 参照を防ぐための初期値
let condition = null; // 修正: グローバル条件も初期化

function getConditionFormID(pid) { //条件を決める
  const id = Number(pid);

  if (id >= 1 && id <= 25) //1~100は試験用のpid
    return { learnType: "analog", answerType: "analog" };
  else if (id >= 26 && id <= 50)
    return { learnType: "analog", answerType: "digital" };
  else if (id >= 51 && id <= 75)
    return { learnType: "digital", answerType: "analog" };
  else if (id >= 76 && id <= 100)
    return { learnType: "digital", answerType: "digital" };
  else if (id >= 101 && id <= 300) //ここからが本番用
    return { learnType: "analog", answerType: "analog" };
  else if (id >= 301 && id <= 500) 
    return { learnType: "analog", answerType: "digital" };
  else if (id >= 501 && id <= 700) 
    return { learnType: "digital", answerType: "analog" };
  else if (id >= 701 && id <= 900) 
    return { learnType: "digital", answerType: "digital" };
  return null;
}

const pidInputArea = document.getElementById("pid-input-area");
const startButton = document.getElementById("start");
const finishButton = document.getElementById("finish");
const quizDiv = document.getElementById("quiz");

function showPidInputState() {
  pidInputArea.style.display = "block";
  startButton.style.display = "none";
  quizDiv.style.display = "none";
  finishButton.style.display = "none";
}

function showStartState() {
  pidInputArea.style.display = "none";
  startButton.style.display = "block";
  quizDiv.style.display = "none";
  finishButton.style.display = "none";
}

function showQuizState() {
  pidInputArea.style.display = "none";
  startButton.style.display = "none";
  quizDiv.style.display = "block";
  finishButton.style.display = "block";
}

function showAnalogState() {
  pidInputArea.style.display = "none";
  startButton.style.display = "none";
  quizDiv.style.display = "none";
  finishButton.style.display = "block";
}

function setParticipantFromPid(pid) {
  const cond = getConditionFormID(pid);
  if (!cond) {
    alert("無効な参加者IDです。1〜900の数字を指定してください。");
    showPidInputState();
    return false;
  }

  window.participantId = pid;
  window.learnType = cond.learnType;
  window.answerType = cond.answerType;
  window.condition = `${cond.learnType}_learn_${cond.answerType}_answer`;
  return true;
}

const pidFromURL = new URLSearchParams(window.location.search).get("pid");
if (pidFromURL && setParticipantFromPid(pidFromURL)) {
  showStartState();
} else {
  showPidInputState();
}

const pidSubmit = document.getElementById("pid-submit");
if (pidSubmit) {
  pidSubmit.addEventListener("click", () => {
    const pid = document.getElementById("pid").value;
    if (!pid || isNaN(pid) || pid < 1 || pid > 900) {
      alert("有効な参加者IDを入力してください（1〜900の数字）。");
      return;
    }
    window.location.href = `?pid=${pid}`;
  });
}

const Questions = [
    {
        id: 1,
        text: "ex) a", correct: "1", //ここで実際の問題文と正解を入れる
    },
    {
        id: 2,
        text: "ex) b", correct: "2",
    }, 
    {
      id: 3,
      text: "ex) c", correct: "3",
    },
    {
      id: 4,
      text: "ex) d", correct: "4"
    }
];

const choicePool = [
    "1", //ここで実際の選択肢を入れる
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
];

function shuffle(array) {
  // 修正: shuffle() が未定義だったため、選択肢のランダム化処理を追加
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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

// 修正: generateChoices() をpid設定後にしか実行しないよう遅延初期化
let quiz = null;
function initializeQuiz() {
  quiz = Questions.map(q => {
    return {
      id: q.id,
      text: q.text,
      correct: q.correct,
      choices: generateChoices(q.correct)
    };
  });
}

const startTimes = {};

function showQuestions() {
  if (!quiz) {
    // 修正: quizが初期化されていない場合の防止策
    alert("クイズが初期化されていません。ページをリロードしてください。");
    return;
  }
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
  document.querySelectorAll(".choicebox").forEach(btn => {
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

      // 修正: 選択肢はbutton要素ではなくdiv.choiceboxなので、正しく無効化する
      const questionBlock = btn.closest(".question-block");
      questionBlock.querySelectorAll(".choicebox").forEach(b => {
        b.style.pointerEvents = "none";
        b.classList.add("disabled");
      });
    });
  });
}

let testStart = null;

// クイズ開始イベント
const startButton = document.getElementById("start");
if (startButton) {
  startButton.addEventListener("click", () => {
    if (!window.answerType) {
      alert("回答タイプが設定されていません。参加者IDを確認してください。");
      return;
    }
    if (!window.participantId || !window.learnType) {
      alert("参加者情報が不完全です。ページをリロードして再試行してください。");
      return;
    }
    // 修正: startボタンを押した時点でもinitializeQuiz()を確実に実行し、quizが初期化されていることを保証する
    if (!quiz) {
      initializeQuiz();
    }
    startButton.style.display = "none"; //スタートボタンを消す
    if (window.answerType === "analog") { //アナログ回答の場合；問題を出さない
      quizDiv.style.display = "none"; //クイズを非表示
      finishButton.style.display = "block"; // 回答終了ボタンを表示
      testStart = Date.now(); //テスト開始時刻を記録
    }
    if (window.answerType === "digital") { //デジタル回答の場合；問題を出す
      quizDiv.style.display = "block"; //クイズを表示
      testStart = Date.now(); //テスト開始時刻を記録
      results.length = 0; //結果を初期化
      showQuestions(); //問題を表示
      finishButton.style.display = "block"; // 回答終了ボタンを表示
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