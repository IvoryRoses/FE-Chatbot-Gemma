import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";
import { FaGoogle, FaYahoo, FaFacebook } from "react-icons/fa";

export default function Signup() {
  const handleGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("User signed in:", user);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleYahoo = async () => {};
  const handleFacebook = async () => {};

  return (
    <div className="fixed top-0 left-0 flex h-screen w-screen flex-col items-center justify-center bg-[#212121]">
      <div className="relative flex h-[40rem] w-[30rem] flex-col rounded-md border border-[#4e4e4e] bg-[#171717] p-2">
        <button
          onClick={handleGoogle}
          className="hover:bg-[#3a3a3a]-white flex items-center gap-2 rounded-md bg-[#2d2d2d] p-2 text-white"
        >
          <FaGoogle size={30} /> Log in with Google
        </button>
        <button
          onClick={handleYahoo}
          className="hover:bg-[#3a3a3a]-white flex items-center gap-2 rounded-md bg-[#2d2d2d] p-2 text-white"
        >
          <FaYahoo size={30} /> Log in with Yahoo
        </button>
        <button
          onClick={handleFacebook}
          className="hover:bg-[#3a3a3a]-white flex items-center gap-2 rounded-md bg-[#2d2d2d] p-2 text-white"
        >
          <FaFacebook size={30} /> Log in with Facebook
        </button>
      </div>
    </div>
  );
}
