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
const customTopicForm = document.querySelector("#custom-topic-form");
const customTopicInput = document.querySelector("#custom-topic");
const customTopicStatus = document.querySelector("#custom-topic-status");
const customTopicsStorageKey = "one-minute-speech.custom-topics";

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
const customTopics = [];
const topicKeys = new Set(TOPICS.map(topicKey));

function normalizeTopic(title) {
  return title.normalize("NFKC").toLowerCase().replace(/[\s\p{Dash_Punctuation}]+/gu, "");
}

function topicKey(title) {
  const normalized = normalizeTopic(title);
  const canonical = TOPIC_ALIASES.get(normalized);
  return canonical === undefined ? normalized : normalizeTopic(canonical);
}

function isValidTopic(title) {
  return title.length <= customTopicInput.maxLength && /[\p{L}\p{N}]/u.test(title);
}

function addCustomTopic(title) {
  const key = topicKey(title);
  if (topicKeys.has(key)) return false;

  topicKeys.add(key);
  customTopics.push(title);
  if (previousTopic) {
    const index = Math.floor(Math.random() * (remainingTopics.length + 1));
    remainingTopics.splice(index, 0, title);
  }
  return true;
}

function loadCustomTopics() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(customTopicsStorageKey) ?? "[]");
  } catch {
    return;
  }
  if (!Array.isArray(saved)) return;

  for (const item of saved) {
    if (typeof item !== "string") continue;
    const title = item.trim();
    if (isValidTopic(title)) addCustomTopic(title);
  }
}

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
  const topics = [...TOPICS, ...customTopics];
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

loadCustomTopics();

customTopicInput.addEventListener("input", () => {
  customTopicStatus.textContent = "";
});

customTopicForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = customTopicInput.value.trim();
  if (!isValidTopic(title)) {
    customTopicStatus.textContent = "请输入一个题目名称，最多 40 字。";
    return;
  }

  loadCustomTopics();
  if (!addCustomTopic(title)) {
    customTopicStatus.textContent = "这个题目已在题库中。";
    return;
  }

  customTopicInput.value = "";
  try {
    localStorage.setItem(customTopicsStorageKey, JSON.stringify(customTopics));
    customTopicStatus.textContent = "已添加，会参与随机抽题。";
  } catch {
    customTopicStatus.textContent = "已加入本页。浏览器未能保存，刷新后需要重新添加。";
  }
});
