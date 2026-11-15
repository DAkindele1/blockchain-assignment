import React from "react";
import logo from "src/assets/pig-0.png";
import { AiFillHome } from "react-icons/ai";
import { Link } from "react-router-dom";
import BackButton from "src/components/BackButton";

export default function HowToPlay() {

  return (
    <div className="p-[5%] flex flex-col relative w-full items-center ">
      <nav className="fixed top-0 w-full flex justify-between p-[5%]">
        <BackButton />
        <Link
          to={`/`}
          aria-label="Home"
          className=" bg-[#D30CBD80] hover:bg-[#D30CBD] duration-300 text-white w-[48px] h-[48px] border rounded-full flex items-center justify-around"
        >
          <AiFillHome size={24} />
        </Link>
      </nav>

      <div className="flex flex-col items-center gap-6 lg:gap-12 md:max-w-[70%] xl:max-w-[55%]">
        <figure className="">
          <img src={logo} alt="logo" width={400} />
        </figure>
        <section className="text-white space-y-4">
          <h1 className="pri-font text-2xl lg:text-4xl">GAME SETUP</h1>
          <section className=" backdrop:blur bg-[#ffffff10] px-8 lg:px-12 py-6 border text-base lg:text-xl rounded-lg">
            <ol className=" list-decimal">
              <li>Choose <b>With friends</b> or <b>Vs computer</b> (Easy, Medium or Hard)</li>
              <li>Enter the max score you want to reach (25 to 500)</li>
              <li>Add the players and enter their names (2 to 8 players with friends)</li>
              <li>Click "Start Game"</li>
            </ol>
          </section>
        </section>
  
        <section className="text-white space-y-4">
          <h1 className="pri-font text-2xl lg:text-4xl">GREEDY PIG RULES </h1>
          <section className=" backdrop:blur bg-[#ffffff10] px-8 lg:px-12 py-6 border text-base lg:text-xl rounded-lg flex flex-col items-center text-center">
          <h4 className=" text-lg lg:text-2xl font-bold">
            1.
          </h4>
          <p >
          Each turn, a player repeatedly rolls a die until either a <b>1</b> is rolled or the player decides to <b>"pass"</b>
          </p>
          </section>
          <section className=" backdrop:blur bg-[#ffffff10] px-8 lg:px-12 py-6 border text-base lg:text-xl rounded-lg flex flex-col items-center text-center">
          <h4 className=" text-lg lg:text-2xl font-bold">
            2.
          </h4>
          <p >
          If the player rolls a <b>1</b>, they score nothing and it becomes the next player's turn.
          </p>
          </section>
          <section className=" backdrop:blur bg-[#ffffff10] px-8 lg:px-12 py-6 border text-base lg:text-xl rounded-lg flex flex-col items-center text-center">
          <h4 className=" text-lg lg:text-2xl font-bold">
            3.
          </h4>
          <p >
          If the player rolls any other number, it is added to their turn total and the player's turn continues.
          </p>
          </section>
          <section className=" backdrop:blur bg-[#ffffff10] px-8 lg:px-12 py-6 border text-base lg:text-xl rounded-lg flex flex-col items-center text-center">
          <h4 className=" text-lg lg:text-2xl font-bold">
            4.
          </h4>
          <p >
          The first player to reach the <b>max score</b> wins. You must roll at least once before you can pass.
          </p>
          </section>
        </section>
        <section className="text-white space-y-4">
          <h1 className="pri-font text-2xl lg:text-4xl">KEYBOARD SHORTCUTS</h1>
          <section className=" backdrop:blur bg-[#ffffff10] px-8 lg:px-12 py-6 border text-base lg:text-xl rounded-lg">
            <ul className="space-y-2">
              <li><kbd className="font-mono bg-[#ffffff25] rounded px-2">Space</kbd> or <kbd className="font-mono bg-[#ffffff25] rounded px-2">R</kbd> roll the die</li>
              <li><kbd className="font-mono bg-[#ffffff25] rounded px-2">P</kbd> or <kbd className="font-mono bg-[#ffffff25] rounded px-2">H</kbd> pass and bank your points</li>
              <li><kbd className="font-mono bg-[#ffffff25] rounded px-2">M</kbd> sound on / off</li>
              <li><kbd className="font-mono bg-[#ffffff25] rounded px-2">?</kbd> open the tutorial</li>
            </ul>
            <p className="mt-4 text-base">Screen readers announce every roll, pass and turn change.</p>
          </section>
        </section>
        <section className="text-white space-y-4">
          <h1 className="pri-font text-2xl lg:text-4xl">About the Devs</h1>
          <section className=" backdrop:blur bg-[#ffffff10] px-8 lg:px-12 py-6 border text-base lg:text-xl rounded-lg">
            <ul className=" list-disc space-y-4">
              <li>Original game by Nwachukwu (front-end dev).</li>
              <li>This is my <a href="https://sites.google.com/view/nwachukwuujubuonu/home" target="blanks" className=" underline text-[#D30CBD] font-bold">portfolio site</a> if you you like to see some of my other works.</li>
              <li>Built with React and Vite. This version adds a Postgres-backed API, computer opponents, a leaderboard and accessibility features for CSC 419 at Pan-Atlantic University.</li>
              <li>I didn't work alone. This project was designed by <b>Oluwatomisin Rhema Eghosa Odukoya</b> and <b>Alozie Blessed  Chuebuka</b>. </li>
            </ul>
          </section>
        </section>
      </div>
    </div>
  );
}
