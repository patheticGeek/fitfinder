import { Link } from "@tanstack/react-router";

export default function Header({ email }: { email?: string }) {
  return (
    <>
      <div className="p-2 flex items-center gap-4 text-lg">
        <Link to="/" activeProps={{ className: "font-bold" }}>
          <span className="text-xl font-semibold">FitFinder</span>
        </Link>
        <Link
          to="/"
          activeProps={{
            className: "font-bold",
          }}
          activeOptions={{ exact: true }}
        >
          Home
        </Link>
        <Link
          to="/apply"
          activeProps={{
            className: "font-bold",
          }}
          activeOptions={{ exact: true }}
        >
          Apply
        </Link>
        {email && (
          <Link
            to="/organizations"
            activeProps={{
              className: "font-bold",
            }}
            activeOptions={{ exact: true }}
          >
            Organizations
          </Link>
        )}
        <div className="ml-auto">
          {email ? (
            <>
              <span className="mr-2">{email}</span>
              <Link to="/logout">Logout</Link>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </div>
      <hr />
    </>
  );
}
