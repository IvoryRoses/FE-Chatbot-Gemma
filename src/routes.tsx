import Signup from "./pages/Signup";
import Chatbot from "./pages/Chatbot";
import PrivateRoute from "./components/routes/PrivateRoute"; // Make sure path is correct

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
];

export const browserRoutes = routes.map((route) => {
  return { path: route.path, element: route.component };
});

export default routes;
