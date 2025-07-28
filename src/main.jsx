import React from "react";
import ReactDOM from "react-dom/client";
import App, { TitleBar } from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
    <>

   {/*<React.StrictMode>*/}
    {/* <EnvironmentProvider> */}
    <TitleBar title={"Crow"}/>
      <App />
    {/* </EnvironmentProvider> */}
   {/*</React.StrictMode>,*/}
    </>
);
