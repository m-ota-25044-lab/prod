let participantId = localStorage.getItem("participantId") || null;
let learnType = null; // 修正: undefined 参照を防ぐための初期値
let answerType = null; // 修正: undefined 参照を防ぐための初期値
let condition = null; // 修正: グローバル条件も初期化

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

if(!pidFromURL) {
  document.getElementById("pid-input-area").style.display = "block"; //参加者IDをURLから取得できない場合に入力画面表示
  document.getElementById("start").style.display = "none";
  document.getElementById("finish").style.display = "none";
  document.getElementById("quiz").style.display = "none"; //クイズを非表示
} else { //参加者IDがURLから取得できる場合
  const cond = getConditionFormID(pidFromURL);
  if (cond) {
    window.participantId = pidFromURL;
    window.learnType = cond.learnType;
    window.answerType = cond.answerType;
    window.condition = `${cond.learnType}_learn_${cond.answerType}_answer`;
    console.log("URLから参加者IDを取得:", window.condition);
    initializeQuiz(); // 修正: pid設定後にquizを初期化（generateChoices()もここで実行される）
    document.getElementById("pid-input-area").style.display = "none"; // 修正: 有効なPIDの場合は入力画面を隠す
    document.getElementById("start").style.display = "block"; // 修正: 開始ボタンを表示する
    document.getElementById("quiz").style.display = "none";
    document.getElementById("finish").style.display = "none";
  } else {
    // 修正: 無効な参加者IDが来た場合は開始前にUIを戻す
    alert("無効な参加者IDです。1〜800の数字を指定してください。");
    document.getElementById("pid-input-area").style.display = "block";
    document.getElementById("start").style.display = "none";
    document.getElementById("finish").style.display = "none";
    document.getElementById("quiz").style.display = "none";
  }
}

const pidSubmit = document.getElementById("pid-submit");
if (pidSubmit) {
  pidSubmit.addEventListener("click", () => {
    const pid = document.getElementById("pid").value;

    if (!pid || isNaN(pid) || Number(pid) < 1 || Number(pid) > 800) {
      alert("有効な参加者IDを入力してください（1〜800の数字）");
      return;
    }
    // 修正: フォーム送信時にもquizを初期化（URLに?pidをつけてリロードされる前に初期化）
    const cond = getConditionFormID(pid);
    if (cond) {
      window.participantId = pid;
      window.learnType = cond.learnType;
      window.answerType = cond.answerType;
      window.condition = `${cond.learnType}_learn_${cond.answerType}_answer`;
      initializeQuiz();
    }
    window.location.href = `?pid=${pid}`; //参加者IDをURLに付加してリロード
  });
}

const questions = [
    {
        id: 1,
        text: "", correct: "", //ここで実際の問題文と正解を入れる
    },
    {
        id: 2,
        text: "", correct: "",
    }, //これを必要な数だけ繰り返す
];

const choicePool = [
    "", //ここで実際の選択肢を入れる
    "", //これも必要な数だけ繰り返す
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
  quiz = questions.map(q => {
    return {
      id: q.id,
      text: q.text,
      correct: q.correct,
      choices: generateChoices(q.correct)
    };
  });
}

const quizDiv = document.getElementById("quiz");
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