const prepareSeconds = 10 * 60;
const speakSeconds = 60;
const topic = document.querySelector("#topic");
const draw = document.querySelector("#draw");
const advance = document.querySelector("#advance");
const phaseLabel = document.querySelector("#phase");
const countdown = document.querySelector("#countdown");
const dial = document.querySelector("#dial");
const hint = document.querySelector("#hint");
const stages = document.querySelectorAll("[data-phase]");
const phases = {
  ready: { label: "可以开始", button: "开始准备", hint: "用 10 分钟查资料、理思路", seconds: prepareSeconds },
  prepare: { label: "准备中", button: "现在开讲", hint: "时间到后自动开始讲述", seconds: prepareSeconds },
  speak: { label: "讲述中", button: "结束讲述", hint: "用自己的话解释这个概念，可以举个例子", seconds: speakSeconds },
  done: { label: "本轮完成", button: "再抽一题", hint: "回想一句你最想让听众记住的话", seconds: 0 }
};

let phase = "ready";
let previousTopic = "";
let remainingTopics = [];
let deadline = 0;
let ticker;
function renderTime(remaining, total) {
  const seconds = Math.ceil(remaining / 1000);
  const minutesPart = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secondsPart = String(seconds % 60).padStart(2, "0");
  countdown.textContent = minutesPart + ":" + secondsPart;
  const progress = total > 0 ? remaining / total * 100 : 0;
  dial.style.setProperty("--remaining", progress + "%");
}

function setPhase(next, startAt = Date.now()) {
  clearInterval(ticker);
  phase = next;
  const current = phases[next];
  phaseLabel.textContent = current.label;
  advance.textContent = current.button;
  advance.disabled = false;
  hint.textContent = current.hint;
  draw.hidden = next !== "ready";
  for (const stage of stages) {
    if (stage.dataset.phase === next) stage.setAttribute("aria-current", "step");
    else stage.removeAttribute("aria-current");
  }

  const total = current.seconds * 1000;
  if (next === "prepare" || next === "speak") {
    deadline = startAt + total;
    ticker = setInterval(updateTime, 100);
    updateTime();
  } else {
    renderTime(total, total);
  }
}

function updateTime() {
  const remaining = Math.max(0, deadline - Date.now());
  renderTime(remaining, phases[phase].seconds * 1000);
  if (remaining > 0) return;
  if (phase === "prepare") setPhase("speak", deadline);
  else if (phase === "speak") setPhase("done");
}

function shuffleTopics() {
  const topics = [...TOPICS];
  for (let index = topics.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [topics[index], topics[other]] = [topics[other], topics[index]];
  }

  // The next draw pops the last item, so keep it distinct across rounds.
  const last = topics.length - 1;
  if (last > 0 && topics[last] === previousTopic) {
    const other = Math.floor(Math.random() * last);
    [topics[last], topics[other]] = [topics[other], topics[last]];
  }
  return topics;
}

function drawTopic() {
  if (remainingTopics.length === 0) remainingTopics = shuffleTopics();
  previousTopic = remainingTopics.pop();
  topic.textContent = previousTopic;
  draw.textContent = "换一道题";
  setPhase("ready");
}

draw.addEventListener("click", drawTopic);
advance.addEventListener("click", () => {
  if (phase === "ready") setPhase("prepare");
  else if (phase === "prepare") setPhase("speak");
  else if (phase === "speak") setPhase("done");
  else drawTopic();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && (phase === "prepare" || phase === "speak")) updateTime();
});
