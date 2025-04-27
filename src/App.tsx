import { useState } from "react";

export default function App() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    const res = await fetch("http://localhost:8000/chat/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: input }),
    });

    const data = await res.json();
    setResponse(data.response);
    setInput("");
  };

  return (
    <div className="fixed top-0 left-0 flex h-screen w-screen flex-col items-center justify-center bg-black">
      <h1 className="text-red-200">Josh and Seb Chatbot</h1>
      <div className="relative flex h-[40rem] w-[30rem] flex-col rounded-md bg-[#0d0c12] p-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything"
          className="m-2 rounded border bg-[#222425] p-2 text-white"
        />
        <button
          onClick={handleSend}
          className="m-2 rounded bg-red-500 p-2 text-white"
        >
          Send
        </button>

        <div className="m-2 p-2 text-white">{response}</div>
      </div>
    </div>
  );
}
