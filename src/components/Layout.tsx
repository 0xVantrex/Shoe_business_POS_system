import NavBar from "./NavBar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex">
      <NavBar />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
