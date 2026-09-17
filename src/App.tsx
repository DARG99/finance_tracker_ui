import Signup from "./signup/Signup"
import Login from "./login/Login";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

function App() {

  const route = createBrowserRouter([
    {
      path:"/",
      element:<Signup />
    },
        {
      path:"/login",
      element: <Login />
    }
    
  ]);
  return(
    <div className="App">
      <RouterProvider router={route}></RouterProvider>
    </div>
  )
}

export default App;