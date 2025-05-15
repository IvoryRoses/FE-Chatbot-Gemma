import Signup from "./pages/Signup";
import Chatbot from "./pages/Chatbot";
import Messenger from "./pages/Messenger";
import PrivateRoute from "./components/PrivateRoute"; // Make sure path is correct

interface IRoute {
  id: number;
  title: string;
  path: string;
  component: React.ReactNode;
}

const routes: IRoute[] = [
  { id: 1, title: "SignUp", path: "/", component: <Signup /> },
  {
    id: 2,
    title: "Chatbot",
    path: "/chat",
    component: (
      <PrivateRoute>
        <Chatbot />
      </PrivateRoute>
    ),
  },
  {
    id: 3,
    title: "Messenger",
    path: "/messenger",
    component: (
      <PrivateRoute>
        <Messenger />
      </PrivateRoute>
    ),
  },
];

export const browserRoutes = routes.map((route) => {
  return { path: route.path, element: route.component };
});

export default routes;
