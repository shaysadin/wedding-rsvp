import BentoGrid from "@/components/sections/bentogrid";
import Features from "@/components/sections/features";
import HeroLanding from "@/components/sections/hero-landing";
import InfoLanding from "@/components/sections/info-landing";
import Powered from "@/components/sections/powered";
import PreviewLanding from "@/components/sections/preview-landing";
import Testimonials from "@/components/sections/testimonials";
import { NavBar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/site-footer";

export default function IndexPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar scroll={true} />
      <main className="flex-1">
        <HeroLanding />
        <PreviewLanding />
        <Powered />
        <BentoGrid />
        {/* <InfoLanding sectionKey="section1" image="/_static/illustrations/work-from-home.jpg" reverse={true} /> */}
        <InfoLanding sectionKey="section2" image="/_static/illustrations/work-from-home.jpg" />
        <Features />
        <Testimonials />
      </main>
      <SiteFooter />
    </div>
  );
}
