import { HashRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import Home from "@/pages/Home";
import University from "@/pages/University";
import Business from "@/pages/Business";
import Career from "@/pages/Career";
import Skills from "@/pages/Skills";
import Fitness from "@/pages/Fitness";
import LanguagesPage from "@/pages/Languages";
import Finance from "@/pages/Finance";
import Brand from "@/pages/Brand";
import Reading from "@/pages/Reading";
import Journal from "@/pages/Journal";
import Ideas from "@/pages/Ideas";
import Roadmap from "@/pages/Roadmap";
import Analytics from "@/pages/Analytics";
import Plan from "@/pages/Plan";
import CalendarPage from "@/pages/Calendar";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/university" element={<University />} />
          <Route path="/business" element={<Business />} />
          <Route path="/career" element={<Career />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/fitness" element={<Fitness />} />
          <Route path="/languages" element={<LanguagesPage />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/brand" element={<Brand />} />
          <Route path="/reading" element={<Reading />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
