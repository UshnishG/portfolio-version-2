import { MultiWindowManager } from "@/components/terminal/MultiWindowManager";
import Terminal from "./Index";

const IndexWithWindows = () => {
  return (
    <MultiWindowManager>
      {(windowId) => <Terminal key={windowId} windowId={windowId} />}
    </MultiWindowManager>
  );
};

export default IndexWithWindows;
