export default function App() {
  return (
    <div className="fixed top-0 left-0 flex h-screen w-screen flex-col items-center justify-center bg-black">
      <h1 className="text-red-200">Josh and Seb Chatbot</h1>
      <div className="relative flex h-[40rem] w-[30rem] flex-col rounded-md bg-[#0d0c12]">
        <input
          type="text"
          placeholder="Ask me anything"
          className="m-2 rounded border bg-[#222425] p-2 text-white"
        />
      </div>
    </div>
  );
}
