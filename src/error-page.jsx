import { Link, useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);
  const notFound = error?.status === 404;

  return (
    <div
      id="error-page"
      role="alert"
      className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <h1 className="pri-font text-4xl">{notFound ? "Page not found" : "Oops!"}</h1>
      <p className="max-w-md">
        {notFound
          ? "That page doesn't exist. Let's get you back to the game."
          : "Something went wrong on our side. Going back to the home page usually fixes it."}
      </p>
      <Link to="/" className="rounded px-8 py-3 bg-[#D30CBD] font-bold hover:scale-95 duration-300">
        Back to home
      </Link>
    </div>
  );
}
