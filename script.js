/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

// Store selected products in an array
let selectedProducts = [];

// Load selected products from localStorage if available (global, not inside displayProducts)
function loadSelectedProductsFromStorage() {
  const stored = localStorage.getItem("selectedProducts");
  if (stored) {
    try {
      selectedProducts = JSON.parse(stored);
    } catch (e) {
      selectedProducts = [];
    }
  }
}

// Save selected products to localStorage (global, not inside displayProducts)
function saveSelectedProductsToStorage() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      // Check if product is selected
      // Use product.id for matching instead of product.name for reliability
      const isSelected = selectedProducts.some((p) => p.id === product.id);
      // Add a product-desc overlay div for the description
      return `
    <div class="product-card${
      isSelected ? " selected" : ""
    }" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="product-desc">${product.description}</div>
    </div>
  `;
    })
    .join("");

  // Add click event listeners to product cards
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      // Use product id for matching
      const id = Number(card.getAttribute("data-product-id"));
      // Always find the product from allProducts for consistency
      const product = allProducts.find((p) => p.id === id);
      if (!product) return;
      // If already selected, remove from selectedProducts
      const index = selectedProducts.findIndex((p) => p.id === id);
      if (index > -1) {
        selectedProducts.splice(index, 1);
      } else {
        selectedProducts.push(product);
      }
      displayProducts(products); // Update selection effect
      renderSelectedProducts();
      saveSelectedProductsToStorage();
    });
  });
  // ...existing code...
}

// Render selected products in the selected products box
function renderSelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected</div>`;
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product" data-product-id="${product.id}">
          <span>${product.name}</span>
        </div>
      `
    )
    .join("");

  // Add click event listeners to remove selected products
  const selectedEls = document.querySelectorAll(".selected-product");
  selectedEls.forEach((el) => {
    el.addEventListener("click", () => {
      const id = Number(el.getAttribute("data-product-id"));
      selectedProducts = selectedProducts.filter((p) => p.id !== id);
      // Re-render both product cards and selected products
      let currentProducts = [];
      if (categoryFilter.value) {
        loadProducts().then((allProducts) => {
          currentProducts = allProducts.filter(
            (p) => p.category === categoryFilter.value
          );
          displayProducts(currentProducts);
        });
      } else {
        loadProducts().then((allProducts) => {
          displayProducts(allProducts);
        });
      }
      renderSelectedProducts();
      saveSelectedProductsToStorage();
    });
  });
}

// --- Product Filtering Logic ---
const productSearch = document.getElementById("productSearch");
let allProducts = [];

// Helper to filter products by category and search
function filterAndDisplayProducts() {
  let filtered = allProducts;
  const selectedCategory = categoryFilter.value;
  const searchTerm = productSearch.value.trim().toLowerCase();
  if (selectedCategory) {
    filtered = filtered.filter(
      (product) => product.category === selectedCategory
    );
  }
  if (searchTerm) {
    filtered = filtered.filter((product) => {
      // Search in name, brand, and description
      return (
        product.name.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm) ||
        (product.description &&
          product.description.toLowerCase().includes(searchTerm))
      );
    });
  }
  displayProducts(filtered);
}

// Category filter event
categoryFilter.addEventListener("change", filterAndDisplayProducts);
// Search field event
productSearch.addEventListener("input", filterAndDisplayProducts);

// On page load, restore selected products and products list
loadSelectedProductsFromStorage();
renderSelectedProducts();
// Add event listener for clear selected products button
document.addEventListener("DOMContentLoaded", function () {
  const clearSelBtn = document.getElementById("clearSelectedProducts");
  if (clearSelBtn) {
    clearSelBtn.addEventListener("click", function () {
      selectedProducts = [];
      saveSelectedProductsToStorage();
      renderSelectedProducts();
      // Also update product cards to remove selection highlight
      displayProducts(allProducts);
    });
  }
});
// Load all products once and display
loadProducts().then((products) => {
  allProducts = products;
  displayProducts(allProducts);
});

// --- Chat and Routine Generation Logic ---

// Store conversation history in localStorage
let conversationHistory = [];

// Load conversation history from localStorage
function loadConversationHistory() {
  const stored = localStorage.getItem("conversationHistory");
  if (stored) {
    try {
      conversationHistory = JSON.parse(stored);
    } catch (e) {
      conversationHistory = [];
    }
  }
}

// Save conversation history to localStorage
function saveConversationHistory() {
  localStorage.setItem(
    "conversationHistory",
    JSON.stringify(conversationHistory)
  );
}

// Render chat messages in the chat window
function renderChat() {
  // Only render user and assistant messages (never system)
  const chatHistoryToRender = conversationHistory.filter(
    (msg) => msg.role === "user" || msg.role === "assistant"
  );
  if (chatHistoryToRender.length === 0) {
    chatWindow.innerHTML =
      '<div class="placeholder-message">Ask a question or generate your routine!</div>';
    return;
  }
  chatWindow.innerHTML = chatHistoryToRender
    .map((msg) => {
      if (msg.role === "user") {
        // User messages: show in a user bubble
        return `<div class="chat-bubble user-bubble"><span class="bubble-label">You</span><span class="bubble-content">${escapeHtml(msg.content)}</span></div>`;
      } else {
        // Advisor messages: show in an advisor bubble
        return `<div class="chat-bubble advisor-bubble"><span class="bubble-label">Advisor</span><span class="bubble-content">${formatAdvisorMessage(msg.content)}</span></div>`;
      }
    })
    .join("");
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// --- Helper functions for formatting ---
// Escape HTML to prevent XSS
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}
// Format advisor message: paragraphs and lists
function formatAdvisorMessage(text) {
  // Convert numbered and bullet lists to HTML lists
  let html = escapeHtml(text);
  // Numbered lists: 1. item\n2. item
  html = html.replace(
    /(\n|^)(\d+)\. (.+?)(?=(\n\d+\. |$))/gs,
    function (_, br, num, item) {
      return `${br}<li>${item.trim()}</li>`;
    }
  );
  // Bullet lists: - item
  html = html.replace(/(\n|^)- (.+?)(?=(\n- |$))/gs, function (_, br, item) {
    return `${br}<li>${item.trim()}</li>`;
  });
  // Wrap consecutive <li> in <ul> or <ol>
  html = html.replace(/((<li>.*?<\/li>\s*){2,})/gs, function (list) {
    // If the list starts with a number, use <ol>, else <ul>
    return list.match(/<li>\d+\./) ? `<ol>${list}</ol>` : `<ul>${list}</ul>`;
  });
  // Paragraphs: split by double newlines or single newlines not in lists
  html = html.replace(/\n{2,}/g, "</p><p>");
  html = `<p>${html}</p>`;
  // Remove empty <p></p>
  html = html.replace(/<p>\s*<\/p>/g, "");

  // Bold product names in advisor responses for readability
  if (Array.isArray(window.allProducts) && window.allProducts.length > 0) {
    // Sort product names by length descending to avoid partial matches
    const productNames = window.allProducts
      .map((p) => p.name)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    for (const name of productNames) {
      // Regex: match product name outside HTML tags, case-insensitive, not inside <>
      // This will match the product name if it is not inside an HTML tag
      const regex = new RegExp(`(?<![\w>])(${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\w<])`, 'gi');
      html = html.replace(regex, (prod) => `<strong>${prod}</strong>`);
    }
  }
  return html;
}

// Helper: get selected products as a string for the prompt
function getSelectedProductsPrompt() {
  if (selectedProducts.length === 0) return "No products selected.";
  // Use product name, brand, and category for the prompt to help the AI recognize all products
  return selectedProducts
    .map(
      (p) =>
        `- ${p.name} (${p.brand}, ${p.category ? p.category : "no category"})`
    )
    .join("\n");
}

// Helper: fetch all products for follow-up reference
let allProductsCache = null;
async function getAllProducts() {
  if (allProductsCache) return allProductsCache;
  const response = await fetch("products.json");
  const data = await response.json();
  allProductsCache = data.products;
  return allProductsCache;
}

// --- Generate Routine Button ---
// Always use the button from HTML, do not create it dynamically
const generateBtn = document.getElementById("generateRoutine");

// Always keep selectedProducts in sync with localStorage on page load
document.addEventListener("DOMContentLoaded", function () {
  loadSelectedProductsFromStorage();
  renderSelectedProducts();
});

// Add event listener to the generate routine button
generateBtn.addEventListener("click", async () => {
  // Always reload selected products from storage to ensure up-to-date selection
  loadSelectedProductsFromStorage();

  // If no products are selected, show an alert and do nothing
  if (!selectedProducts || selectedProducts.length === 0) {
    alert("Please select at least one product to generate a routine.");
    return;
  }
  // Build initial prompt for the user message
  const prompt = `Create a beauty routine using ONLY these products (with brand):\n${getSelectedProductsPrompt()}\n\nExplain the order and purpose of each. Be clear and concise.`;

  // Always define the system message
  // System prompt rewritten to always generate a beauty routine from any selected products
  const systemMsg = {
    role: "system",
    content:
      "You are a friendly, conversational, and helpful advisor for L'Oréal products. Use a natural, warm, and encouraging tone. Stay polite, upbeat, and respectful. Your tone should reflect L'Oréal's commitment to beauty, innovation, and confidence. Only answer questions about L'Oréal, Lancôme, Redken, Yves Saint Laurent, and the other brands listed in the products.json file. When the user clicks the generate routine button and has selected at least one product, always create a beauty routine using any and all selected products from the products.json file. Clearly explain the order and purpose of each product in the routine. When users mention budget concerns, always factor affordability into your advice and suggest suitable L'Oréal product options across different price points. If the user seems unsure, does not know what a routine is, or hasn't generated a routine yet, ask a few friendly questions about their skin, hair, or beauty preferences (such as skin type, hair type, goals, or concerns). Then, recommend some suitable L'Oréal products and provide a simple routine. Never make up product names, medical claims, or recommendations outside your scope. If the user asks about anything else, respond: 'Sorry, I can only answer questions about L'Oréal products and beauty routines.'",
  };

  // If conversationHistory is empty or only contains system messages, re-initialize
  let hasUserOrAssistant = conversationHistory.some(
    (msg) => msg.role === "user" || msg.role === "assistant"
  );
  if (!hasUserOrAssistant) {
    conversationHistory = [];
  }

  // Always add the system message as the first message if not present
  if (!conversationHistory.length || conversationHistory[0].role !== "system") {
    conversationHistory.unshift(systemMsg);
  }

  // Add the user routine request and show it in the chat
  conversationHistory.push({ role: "user", content: prompt });
  saveConversationHistory();
  renderChat();

  // Show a thinking/loading message so the user knows the AI is preparing a response
  chatWindow.innerHTML += '<div class="placeholder-message">Thinking...</div>';
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Prepare messages for API (system + user/assistant only)
  let messagesToSend = conversationHistory.filter((m) => m.role !== "system");
  messagesToSend = [systemMsg, ...messagesToSend];

  // For routine generation, always send all products for context
  const allProducts = await getAllProducts();
  // Add error handling with try...catch
  try {
    const response = await fetch(
      "https://072e523c-loreal-protection.taldav52.workers.dev",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesToSend,
          allProducts,
          temperature: 0.8,
          max_tokens: 500,
        }),
      }
    );
    const data = await response.json();
    const reply =
      data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : "No response.";
    conversationHistory.push({ role: "assistant", content: reply });
    saveConversationHistory();
    renderChat();
  } catch (error) {
    // Show a friendly error message in the chat window
    chatWindow.innerHTML += `<div class=\"placeholder-message\" style=\"color:red;\">Sorry, there was a problem generating your routine. Please try again later.</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});

// --- Chat Form Submission (Follow-up Questions) ---
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = chatForm.querySelector("input");
  const userMsg = input.value.trim();
  // Always define the system message before using it
  const systemMsg = {
    role: "system",
    content:
      "You are a friendly, conversational, and helpful advisor for L'Oréal products. Use a natural, warm, and encouraging tone. Stay polite, upbeat, and respectful. Your tone should reflect L'Oréal's commitment to beauty, innovation, and confidence. Only answer questions about L'Oréal products, skincare routines, makeup, haircare, cleansers, moisturizers & treatments, hair coloring, hair styling, suncare, men's grooming, and fragrance. When users mention budget concerns, always factor affordability into your advice and suggest suitable L'Oréal product options across different price points. If the user seems unsure, does not know what a routine is, or hasn't generated a routine yet, ask a few friendly questions about their skin, hair, or beauty preferences (such as skin type, hair type, goals, or concerns). Then, recommend some suitable L'Oréal products and provide a simple routine. Never make up product names, medical claims, or recommendations outside your scope. If the user asks about anything else, respond: 'Sorry, I can only answer questions about L'Oréal products and beauty routines.'",
  };
  if (!userMsg) return;
  // Always add the user's message to the conversation before sending
  conversationHistory.push({ role: "user", content: userMsg });
  saveConversationHistory();
  renderChat();
  input.value = "";
  // Always filter out any system messages before sending
  let messagesToSend = conversationHistory.filter((m) => m.role !== "system");
  messagesToSend = [systemMsg, ...messagesToSend];
  // Show loading message
  chatWindow.innerHTML +=
    '<div class="placeholder-message">Processing...</div>';
  chatWindow.scrollTop = chatWindow.scrollHeight;
  // For follow-ups, reference all products
  const allProducts = await getAllProducts();
  // Add error handling with try...catch
  try {
    const response = await fetch(
      "https://072e523c-loreal-protection.taldav52.workers.dev",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesToSend,
          allProducts,
          temperature: 0.8,
        }),
      }
    );
    const data = await response.json();
    const reply =
      data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : "No response.";
    conversationHistory.push({ role: "assistant", content: reply });
    saveConversationHistory();
    renderChat();
  } catch (error) {
    // Show a friendly error message in the chat window
    chatWindow.innerHTML += `<div class="placeholder-message" style="color:red;">Sorry, there was a problem processing your request. Please try again later.</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});

// Function to clear chat history
function clearChatHistory() {
  // Only clear if there is chat history (user or assistant messages)
  const hasUserOrAssistant = conversationHistory.some(
    (msg) => msg.role === "user" || msg.role === "assistant"
  );
  if (!hasUserOrAssistant) {
    // If no chat history, do nothing
    return;
  }
  conversationHistory = [];
  localStorage.removeItem("conversationHistory");
  renderChat();
}

// Add event listener to clear chat button
document.addEventListener("DOMContentLoaded", function () {
  const clearBtn = document.getElementById("clearChat");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearChatHistory);
  }
});

// On page load, restore chat history
loadConversationHistory();
renderChat();
