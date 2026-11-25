import { Link } from "react-router-dom";

/** Render the not found view. */
const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <h1 className="text-6xl font-extrabold text-gray-800">404</h1>
      <p className="mt-4 text-xl text-gray-600">Page not found</p>
      <Link
        to="/homepage"
        className="mt-6 inline-block rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
      >
        Go back to Home
      </Link>
    </div>
  );
};

export default NotFound;
