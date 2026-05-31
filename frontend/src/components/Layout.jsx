import Navbar from "./Navbar";
import ChatbotWidget from "./ChatbotWidget";

function Layout({ children }) {
  const hasToken = Boolean(localStorage.getItem("token"));

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.main}>{children}</main>
      {hasToken && <ChatbotWidget />}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#020617",
    color: "#e5e7eb",
  },
  main: {
    padding: "20px",
  },
};

export default Layout;
