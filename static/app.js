document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const res = await fetch("/process_pdf", {
    method: "POST",
    body: formData
  });
  const data = await res.json();
  if (data.status === "success") {
    const list = document.getElementById("fileList");
    const li = document.createElement("li");
    li.textContent = data.filename;
    list.appendChild(li);
  }
});

document.getElementById("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("queryInput");
  const res = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: input.value })
  });
  const data = await res.json();
  document.getElementById("noRerank").innerText = data["plain"];
  document.getElementById("withRerank").innerText = data["re-ranked"];
});
