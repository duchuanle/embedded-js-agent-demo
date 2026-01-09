(function () {
  // -------------------
  // CONFIG
  // -------------------
  const WEBHOOK_URL =
    "https://kosn8n.duckdns.org/webhook/ef4d3154-f358-4e0a-850f-ffac0ffaa3fe";

  let userData = {};
  let container = document.getElementById("chat-widget-container");
  let sessionId = "";
  let pendingThinking = null;
  let isWaitingForResponse = false;

  // -------------------
  // i18n
  // -------------------
  const i18n = {
    en: {
      header_title: "Chat with us",
      name_label: "Name:",
      phone_label: "Phone:",
      email_label: "Email:",
      name_ph: "Your name",
      phone_ph: "Phone number",
      email_ph: "Email address",
      start_btn: "Start Chat",
      hi: "Hi",
      greet:
        "I am an AI assistant available to help you with your visa inquiries today. Please feel free to ask me any questions you may have.",
    },

    vi: {
      header_title: "Trò chuyện với chúng tôi",
      name_label: "Tên:",
      phone_label: "Số điện thoại:",
      email_label: "Email:",
      name_ph: "Tên của bạn",
      phone_ph: "Số điện thoại",
      email_ph: "Địa chỉ email",
      start_btn: "Bắt đầu chat",
      hi: "Xin chào",
      greet:
        "Tôi là trợ lý AI sẽ hỗ trợ bạn về các thắc mắc visa hôm nay. Nếu bạn có thắc mắc gì xin hãy hỏi tôi.",
    },

    zh: {
      header_title: "与我们聊天",
      name_label: "姓名：",
      phone_label: "电话：",
      email_label: "邮箱：",
      name_ph: "您的姓名",
      phone_ph: "电话号码",
      email_ph: "电子邮箱",
      start_btn: "开始聊天",
      hi: "你好",
      greet: "我是AI助手，将为您解答签证相关问题。歡迎隨時提問",
    },
  };

  let lang = "en";

  // ========================================================
  // BUILD DOM
  // ========================================================

  container.innerHTML = `
    <div id="chat-bubble">💬</div>

    <div id="chat-widget">
      <div id="chat-header">
        <span data-i18n="header_title">Chat with us</span>
      </div>

      <div id="start-screen">
        <div class="form-group">
          <label data-i18n="name_label">Name:</label>
          <input id="user-name" type="text" placeholder="Your name">
        </div>

        <div class="form-group">
          <label data-i18n="phone_label">Phone:</label>
          <input id="user-phone" type="text" placeholder="Phone number">
        </div>
		
		  <div class="form-group">
			<label data-i18n="email_label">Email:</label>
			<input id="user-email" type="email" placeholder="Email address">
		  </div>


        <button id="start-btn">Start Chat</button>

        <select id="language-selector">
          <option value="en">EN</option>
          <option value="vi">VI</option>
          <option value="zh">中文</option>
        </select>
      </div>

      <div id="chat-screen">
        <div id="chat-messages"></div>
        <div id="chat-buttons"></div>

        <div id="chat-input-area">
          <input id="chat-input" type="text" placeholder="Type a message...">
          <button id="send-btn">&#x3e</button>
        </div>
      </div>
    </div>
  `;

  // ========================================================
  // ELEMENTS (after insert)
  // ========================================================
  const bubble = container.querySelector("#chat-bubble");
  const widget = container.querySelector("#chat-widget");
  const languageSelector = container.querySelector("#language-selector");

  const startScreen = container.querySelector("#start-screen");
  const nameInput = container.querySelector("#user-name");
  const phoneInput = container.querySelector("#user-phone");
  const emailInput = container.querySelector("#user-email");
  const emailError = document.createElement("div");
  emailError.style.color = "red";
  emailError.style.fontSize = "12px";
  emailError.style.display = "none";
  emailInput.parentNode.appendChild(emailError);

  emailInput.addEventListener("blur", () => {
    const email = emailInput.value.trim();

    if (!email) {
      emailError.style.display = "none";
      emailInput.classList.remove("error");
      return;
    }

    if (!isValidEmail(email)) {
      emailError.textContent = "Invalid email address";
      emailError.style.display = "block";
      emailInput.classList.add("error");
    } else {
      emailError.style.display = "none";
      emailInput.classList.remove("error");
    }
  });

  const startBtn = container.querySelector("#start-btn");

  const chatScreen = container.querySelector("#chat-screen");
  const messagesBox = container.querySelector("#chat-messages");
  const buttonsBox = container.querySelector("#chat-buttons");
  buttonsBox.style.display = "none";
  const chatInput = container.querySelector("#chat-input");
  const sendBtn = container.querySelector("#send-btn");

  // ========================================================
  // Functions
  // ========================================================
  
  let autoScrollEnabled = true;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  function scrollToBottom(force = false) {
	  if (force || autoScrollEnabled) {
		messagesBox.scrollTop = messagesBox.scrollHeight;
	  }
	}

  function generateUUIDv4() {
    const randomValues = crypto.getRandomValues(new Uint8Array(16));
    randomValues[6] = (randomValues[6] & 0x0f) | 0x40;
    randomValues[8] = (randomValues[8] & 0x3f) | 0x80;

    return [...randomValues]
      .map(
        (b, i) =>
          (i === 4 || i === 6 || i === 8 || i === 10 ? "-" : "") +
          b.toString(16).padStart(2, "0")
      )
      .join("");
  }
  
  function isValidEmail(email) {
    // simple + safe frontend validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function applyLanguage() {
    const t = i18n[lang];
    container.querySelector("[data-i18n='header_title']").innerText =
      t.header_title;
    container.querySelector("[data-i18n='name_label']").innerText =
      t.name_label;
    container.querySelector("[data-i18n='phone_label']").innerText =
      t.phone_label;
    nameInput.placeholder = t.name_ph;
    phoneInput.placeholder = t.phone_ph;
    startBtn.innerText = t.start_btn;
  }

  applyLanguage();

  // ========================================================
  // Opening/Closing
  // ========================================================
  /*bubble.addEventListener("click", () => {
    widget.classList.add("open");
    bubble.style.display = "none";
  });

  closeBtn.addEventListener("click", () => {
    widget.classList.remove("open");
    setTimeout(() => (bubble.style.display = "flex"), 250);
  });*/
  
	bubble.addEventListener("click", (e) => {
	  e.stopPropagation(); // prevent document click

	  const isOpen = widget.classList.contains("open");

	  if (isOpen) {
		widget.classList.remove("open");
		bubble.style.display = "flex";
	  } else {
		widget.classList.add("open");
		bubble.style.display = "none";
	  }
	});
	
	document.addEventListener("click", (e) => {
	  if (!widget.classList.contains("open")) return;

	  const clickedInsideChat = widget.contains(e.target);
	  const clickedBubble = bubble.contains(e.target);

	  if (!clickedInsideChat && !clickedBubble) {
		widget.classList.remove("open");
		bubble.style.display = "flex";
	  }
	});
	
	widget.addEventListener("click", (e) => {
	  e.stopPropagation();
	});

  // ========================================================
  // Sending + Rendering Messages
  // ========================================================
  function addMessage(text, sender = "bot") {
    const div = document.createElement("div");
    div.className = "message " + sender;
    // div.textContent = text;
    div.innerHTML = simpleMarkdown(text);
    messagesBox.appendChild(div);
    scrollToBottom();
  }

	function simpleMarkdown(text) {
	  return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")

		.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.*?)\*/g, "<em>$1</em>")
		.replace(/`([^`]+)`/g, "<code>$1</code>")
		.replace(/\n/g, "<br>");
	}


  // function streamMessage(message) {
	//   // lock scrolling during AI typing
	//   autoScrollEnabled = false;

	//   let output = "";
	//   addMessage("", "bot");

	//   const lastMsg = messagesBox.lastElementChild;

	//   // scroll ONCE when streaming starts
	//   scrollToBottom(true);

	//   let i = 0;
	//   const timer = setInterval(() => {
	// 	if (i >= message.length) {
	// 	  clearInterval(timer);
	// 	  return;
	// 	}

	// 	output += message[i++];
	// 	lastMsg.textContent = output;

	// 	// ❌ no scrolling while streaming
	//   }, 15);
	// }

  function addThinkingMessage() {
    const div = document.createElement("div");
    div.className = "message bot thinking";
    // div.textContent = "(...)";
    messagesBox.appendChild(div);
    scrollToBottom(true);
    return div;
  }

  async function renderMessageWithThinking(message, delay = 800) {
    // lock auto scroll during bot response
    autoScrollEnabled = false;

    // show thinking bubble
    const thinkingEl = addThinkingMessage();

    // wait before rendering full message
    await sleep(delay);

    // replace thinking with full message
    // thinkingEl.textContent = message;
    thinkingEl.textContent = message;
    thinkingEl.classList.remove("thinking");


    // re-enable auto scroll AFTER render
    autoScrollEnabled = true;
    scrollToBottom(true);
  }


  function showButtons(list) {
	  // no buttons → hide area
	  if (!list || !list.length) {
		buttonsBox.innerHTML = "";
		buttonsBox.style.display = "none";
		return;
	  }

	  buttonsBox.innerHTML = "";
	  buttonsBox.style.display = "flex"; // or "block" depending on your CSS

	  list.forEach((btn) => {
		const b = document.createElement("button");
		b.className = "chat-button";
		b.innerText = btn.label;

		b.onclick = () => {
      if (isWaitingForResponse) return;

      // show label as user message
      addMessage(btn.label, "user");
      scrollToBottom(true);

      // send backend the value
      sendToBackend({
        sessionId: sessionId,
        type: "message",
        user: userData,
        message: btn.value,
      });

      // clear + hide buttons
      buttonsBox.innerHTML = "";
      buttonsBox.style.display = "none";
    };


		buttonsBox.appendChild(b);
	  });

	  scrollToBottom();
	}


  // ========================================================
  // Backend
  // ========================================================
  // async function sendToBackend(payload) {
  //   const res = await fetch(WEBHOOK_URL, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(payload),
  //   });

  //   let data = null;
  //   try {
  //     data = await res.json();
  //   } catch {
  //     const raw = await res.text();
  //     console.log("⚠️ Invalid server response");
  //     console.log("RAW:", raw);
  //     return;
  //   }

  //   // ---- UPDATED PART HERE ----
  //   if (data.agent_response) {
  //     // array of strings
  //     if (Array.isArray(data.agent_response)) {
  //       for (const msg of data.agent_response) {
  //         // streamMessage(msg);
  //         // await sleep(2000);
  //         await renderMessageWithThinking(data.agent_response);
  //       }
  //     }
  //     // fallback: string
  //     else if (typeof data.agent_response === "string") {
  //       // streamMessage(data.agent_response);
  //       await renderMessageWithThinking(data.agent_response);
  //     }
  //   }
  //   if (data.buttons) showButtons(data.buttons);
  // }

  async function sendToBackend(payload) {

    if (isWaitingForResponse) return;

    isWaitingForResponse = true;
    // disable input UI
    chatInput.disabled = true;
    sendBtn.disabled = true;

    // // 🔥 1️⃣ Immediately show thinking bubble
    // pendingThinking = addThinkingMessage();
    const isInit = payload?.type === "init";

    // only show thinking if it's NOT init
    if (!isInit) {
      pendingThinking = addThinkingMessage();
    }

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        const raw = await res.text();
        console.log("⚠️ Invalid server response");
        console.log("RAW:", raw);

        if (pendingThinking) pendingThinking.textContent = "⚠️ Server Error";
        pendingThinking = null;
        return;
      }

      // ---- Process AI response ----
      if (data.agent_response) {

        // array of messages
        if (Array.isArray(data.agent_response)) {
          for (const msg of data.agent_response) {
            
            if (pendingThinking) {
              pendingThinking.classList.remove("thinking");
              pendingThinking.innerHTML = simpleMarkdown(msg);
              pendingThinking = null;
            } else {
              addMessage(msg, "bot");
            }
          }
        }

        // single string
        else if (typeof data.agent_response === "string") {
          if (pendingThinking) {
            pendingThinking.classList.remove("thinking");
            pendingThinking.innerHTML = simpleMarkdown(data.agent_response);
            pendingThinking = null;
          } else {
            addMessage(data.agent_response, "bot");
          }
        }
      }

      if (data.buttons) showButtons(data.buttons);

    } catch (err) {
      console.error("❌ Network error:", err);
      if (pendingThinking) pendingThinking.textContent = "⚠️ Network error";

    } finally {
      // 🔓 THIS IS WHAT YOU WERE MISSING
      isWaitingForResponse = false;
      chatInput.disabled = false;
      sendBtn.disabled = false;
      chatInput.focus();
    }
    
  }

  // ========================================================
  // Start Chat
  // ========================================================
  startBtn.onclick = async () => {
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();

    if (!name || !phone || !email) {
      return alert("Please complete all fields.");
    }

    if (!isValidEmail(email)) {
      emailError.textContent = "Please enter a valid email address";
      emailError.style.display = "block";
      emailInput.focus();
      return;
    }

    emailError.style.display = "none";
    emailInput.classList.remove("error");

    userData = { name, phone, email, lang };

    sessionId = generateUUIDv4();
    sendToBackend({
      sessionId: sessionId,
      type: "init",
      user: userData,
      message: "",
    });

    startScreen.style.display = "none";
    chatScreen.style.display = "flex";

    // streamMessage(`${i18n[lang].hi} ${name}!`);
    // await sleep(500);
    // streamMessage(i18n[lang].greet);
    await renderMessageWithThinking(`${i18n[lang].hi} ${name}!`, 500);
    await renderMessageWithThinking(i18n[lang].greet, 700);
  };

  // ========================================================
  // Send Message
  // ========================================================
  sendBtn.onclick = () => {
    if (isWaitingForResponse) return;
    const text = chatInput.value;
    if (!text) return;
    sendMessage(text);
  };

  chatInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      if (isWaitingForResponse) return;
      sendBtn.click();
    }
  };

  function sendMessage(text) {
	  chatInput.value = "";

	  // user action → re-enable auto scroll
	  autoScrollEnabled = true;

	  addMessage(text, "user");

	  // force scroll for user message
	  scrollToBottom(true);

	  sendToBackend({
      sessionId: sessionId,
      type: "message",
      user: userData,
      message: text,
    });
	}


  languageSelector.onchange = () => {
    lang = languageSelector.value;
    applyLanguage();
  };
})();
