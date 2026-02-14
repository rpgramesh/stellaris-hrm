"use client";

import Link from 'next/link';
import Image from 'next/image';
import { 
  Phone, 
  Mail, 
  Linkedin, 
  Globe, 
  ChevronDown, 
  ArrowRight,
  Users,
  ShieldCheck,
  Cloud,
  Cpu
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      {/* Header */}
      <header className="fixed w-full z-50 bg-white shadow-sm">
        {/* Top bar (contact info) */}
        <div className="bg-[#1a2b4a] text-white py-2 text-xs">
          <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <div className="flex flex-col md:flex-row md:space-x-6 space-y-1 md:space-y-0 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <Phone className="w-3 h-3" />
                <span>Call us: +1300 922 358</span>
              </div>
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <Mail className="w-3 h-3" />
                <span>Email us: contact@stellarisconsulting.com.au</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
               <span className="opacity-80">Follow us:</span>
               <a href="#" className="hover:text-blue-300 transition"><Linkedin className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
        
        {/* Main Nav */}
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
           {/* Logo */}
           <div className="flex items-center">
             <img 
               src="/logo.png" 
               alt="Stellaris Logo" 
               className="h-16 w-auto object-contain"
             />
           </div>
           
           {/* Desktop Nav Links */}
           <nav className="hidden lg:flex items-center space-x-8 text-sm font-bold text-[#1a2b4a]">
             <Link href="#" className="text-[#00b0f0]">Home</Link>
             <div className="group relative cursor-pointer flex items-center space-x-1 hover:text-[#00b0f0] transition">
                <span>Services</span>
                <ChevronDown className="w-3 h-3" />
             </div>
             <div className="group relative cursor-pointer flex items-center space-x-1 hover:text-[#00b0f0] transition">
                <span>Products</span>
                <ChevronDown className="w-3 h-3" />
             </div>
             <div className="group relative cursor-pointer flex items-center space-x-1 hover:text-[#00b0f0] transition">
                <span>Career</span>
                <ChevronDown className="w-3 h-3" />
             </div>
             <div className="group relative cursor-pointer flex items-center space-x-1 hover:text-[#00b0f0] transition">
                <span>About Us</span>
                <ChevronDown className="w-3 h-3" />
             </div>
             <Link href="#" className="hover:text-[#00b0f0] transition">Contact Us</Link>
             
             <div className="flex items-center space-x-1 text-[#00b0f0]">
                <Globe className="w-4 h-4" />
                <span>EN</span>
                <ChevronDown className="w-3 h-3" />
             </div>
           </nav>
           
           {/* My HR Button */}
           <Link href="/login" className="flex items-center group">
             <span className="text-[#0066cc] font-black text-2xl mr-2 group-hover:text-[#0052a3] transition">MY-HR</span>
             <div className="bg-[#0066cc] text-white rounded-full p-2 group-hover:bg-[#0052a3] transition shadow-md">
                <Users className="w-5 h-5" />
             </div>
           </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 bg-white overflow-hidden">
        <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center">
           {/* Text Content */}
           <div className="lg:w-1/2 lg:pr-16 mb-12 lg:mb-0 z-10">
              <h2 className="text-[#00b0f0] font-semibold mb-4 text-lg">IT Advisory & Workforce Solutions</h2>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1a2b4a] leading-tight mb-6">
                Complete Tech Solutions<br/>That Power Your Growth
              </h1>
              <p className="text-gray-500 mb-8 leading-relaxed text-lg max-w-xl">
                 Stellaris is a people-first technology and consulting firm delivering tailored IT and professional services across industries. Driving innovation in Cyber Security, Data Science, Machine Learning, ECM, CRM, BPM, and RPA, while specialising in document generation, management, and capture solutions.
              </p>
              <p className="text-gray-500 mb-8 leading-relaxed text-lg max-w-xl">
                 We are committed to equal opportunity, collaboration, and going the extra mile, supporting over 100+ consultants across Australia, New Zealand, and India.
              </p>
              <button className="bg-[#00b0f0] text-white font-bold py-4 px-10 rounded shadow-lg hover:bg-[#009bd6] transition transform hover:-translate-y-1 text-lg">
                Let's Connect
              </button>
           </div>
           
           {/* Hero Image */}
           <div className="lg:w-1/2 relative">
              <div className="relative z-10 rounded-[60px] overflow-hidden border-8 border-[#e6f7fc] shadow-2xl transform rotate-1 hover:rotate-0 transition duration-500">
                 {/* Placeholder for Hero Image */}
                 <div className="bg-gray-200 w-full h-[500px] flex items-center justify-center relative">
                    <img 
                        src="https://placehold.co/800x600/e6f7fc/1a2b4a?text=Office+Collaboration" 
                        alt="Team Collaboration" 
                        className="w-full h-full object-cover"
                    />
                    {/* Graphic overlays matching design */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/20"></div>
                 </div>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-300 rounded-full opacity-20 blur-2xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-300 rounded-full opacity-20 blur-2xl"></div>
           </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="bg-[#0e2a47] py-24 text-white relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
                <h3 className="text-[#00b0f0] font-bold tracking-widest uppercase mb-3">WHAT WE DO</h3>
                <h2 className="text-4xl md:text-5xl font-bold text-white">Specialised IT Solutions</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Card 1 */}
                <div className="bg-white text-[#1a2b4a] p-8 rounded-xl shadow-xl hover:transform hover:-translate-y-2 transition duration-300">
                    <div className="mb-6 text-[#1a2b4a]">
                        <Users className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold mb-4">Workforce Solutions</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        IT resourcing and staff augmentation backed by strong expertise in identifying and delivering the right skills across a wide range of IT domains, including niche and hard-to-find capabilities.
                    </p>
                </div>

                {/* Card 2 */}
                <div className="bg-white text-[#1a2b4a] p-8 rounded-xl shadow-xl hover:transform hover:-translate-y-2 transition duration-300">
                    <div className="mb-6 text-[#1a2b4a]">
                        <ShieldCheck className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold mb-4">Cyber Security</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Deep expertise in cyber security and data governance, encompassing identity and access management, cloud security, privacy compliance, and data protection to safeguard your digital landscape and deliver secure, modernised solutions.
                    </p>
                </div>

                {/* Card 3 */}
                <div className="bg-white text-[#1a2b4a] p-8 rounded-xl shadow-xl hover:transform hover:-translate-y-2 transition duration-300">
                    <div className="mb-6 text-[#1a2b4a]">
                        <Cloud className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold mb-4">Cloud & Data</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Strategic consulting underpinned by deep, specialised IT consulting capabilities across multiple domains—including architecture, cloud, data, security, and platforms—to accelerate your digital initiatives and cloud transformation.
                    </p>
                </div>

                {/* Card 4 */}
                <div className="bg-white text-[#1a2b4a] p-8 rounded-xl shadow-xl hover:transform hover:-translate-y-2 transition duration-300">
                    <div className="mb-6 text-[#1a2b4a]">
                        <Cpu className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold mb-4">Managed Services</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Project-based delivery and managed services delivering end-to-end IT operations, application support, service governance, and continuous improvement to enhance operational efficiency.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* StockSimpli Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center">
           {/* Text Content */}
           <div className="lg:w-1/2 lg:pr-16 mb-12 lg:mb-0">
              <h3 className="text-[#00b0f0] font-bold tracking-widest uppercase mb-3">STOCKSIMPLI</h3>
              <h2 className="text-4xl font-bold text-[#1a2b4a] mb-6 leading-tight">
                Smart Stock &<br/>Inventory<br/>Management Made<br/>Simple
              </h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                 An intuitive and reliable Point of Sale system—online or offline—that's designed to streamline your stock and inventory management. With a wide range of features to suit your business needs, it's easy to set up, simple to manage, and built to keep both your team and customers satisfied.
              </p>
              <p className="text-gray-500 mb-8 leading-relaxed">
                 Track inventory in real-time, manage stock levels efficiently, and process transactions seamlessly—all from one user-friendly platform.
              </p>
              <button className="bg-[#00b0f0] text-white font-bold py-3 px-8 rounded shadow-lg hover:bg-[#009bd6] transition">
                Read More
              </button>
           </div>
           
           {/* Feature Image */}
           <div className="lg:w-1/2 relative">
              <div className="rounded-[40px] overflow-hidden shadow-2xl">
                 <div className="bg-gray-100 w-full h-[400px] flex items-center justify-center">
                    <img 
                        src="https://placehold.co/800x600/f3f4f6/1a2b4a?text=StockSimpli+Tablet" 
                        alt="StockSimpli Dashboard" 
                        className="w-full h-full object-cover"
                    />
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#11111e] text-white pt-20 pb-10">
        <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                {/* Col 1: Logo & Desc */}
                <div>
                    <div className="mb-6">
                        <div className="text-white font-bold text-2xl tracking-widest flex items-center">
                            <span className="text-3xl mr-1">🌳</span> 
                            STELLARIS
                            <sup className="text-xs ml-1">®</sup>
                        </div>
                        <div className="text-[10px] tracking-[0.2em] text-gray-400 font-bold uppercase pl-10">
                            IT Consulting & Resourcing
                        </div>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed mb-8">
                        We are an Australia-based IT professional services firm, offering end-to-end recruitment solutions and IT consulting to drive successful outcomes for our clients.
                    </p>
                    <div className="flex items-center space-x-4">
                        <span className="text-lg font-bold">Have Any Project?</span>
                        <button className="bg-[#00b0f0] text-white font-bold py-2 px-6 rounded shadow hover:bg-[#009bd6] transition">
                            Let's Talk
                        </button>
                    </div>
                </div>

                {/* Col 2: Services */}
                <div>
                    <h4 className="text-xl font-bold mb-6">Services</h4>
                    <ul className="space-y-4 text-gray-400">
                        <li><a href="#" className="hover:text-[#00b0f0] transition flex items-center"><span className="mr-2">›</span> Project & Consulting</a></li>
                        <li><a href="#" className="hover:text-[#00b0f0] transition flex items-center"><span className="mr-2">›</span> IT Professional Services</a></li>
                        <li><a href="#" className="hover:text-[#00b0f0] transition flex items-center"><span className="mr-2">›</span> Workforce Solutions</a></li>
                        <li><a href="#" className="hover:text-[#00b0f0] transition flex items-center"><span className="mr-2">›</span> IT Support</a></li>
                    </ul>
                </div>

                {/* Col 3: Quick Links */}
                <div>
                    <h4 className="text-xl font-bold mb-6">Quick Links</h4>
                    <ul className="space-y-4 text-gray-400">
                        <li><a href="#" className="hover:text-[#00b0f0] transition flex items-center"><span className="mr-2">›</span> About Us</a></li>
                        <li><a href="#" className="hover:text-[#00b0f0] transition flex items-center"><span className="mr-2">›</span> Career Openings</a></li>
                        <li><a href="#" className="hover:text-[#00b0f0] transition flex items-center"><span className="mr-2">›</span> Stocksimpli</a></li>
                        <li><a href="#" className="hover:text-[#00b0f0] transition flex items-center"><span className="mr-2">›</span> Contact Us</a></li>
                    </ul>
                </div>

                {/* Col 4: Contact */}
                <div>
                    <h4 className="text-xl font-bold mb-6">Contact</h4>
                    <ul className="space-y-6 text-gray-400">
                        <li className="flex items-start">
                            <Globe className="w-5 h-5 mr-3 mt-1 text-[#00b0f0]" />
                            <span>Head Office: Level 1, 182 Latrobe Terrace, Geelong West, Victoria 3218, Australia</span>
                        </li>
                        <li className="flex items-center">
                            <Mail className="w-5 h-5 mr-3 text-[#00b0f0]" />
                            <a href="mailto:contact@stellarisconsulting.com.au" className="hover:text-white">contact@stellarisconsulting.com.au</a>
                        </li>
                        <li className="flex items-center">
                            <Phone className="w-5 h-5 mr-3 text-[#00b0f0]" />
                            <a href="tel:1300922358" className="hover:text-white">1300 922 358</a>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
                <div className="mb-4 md:mb-0">
                    © 2026 Stellaris Consulting Australia Pty Ltd. All Rights Reserved | Privacy Policy | Terms of Use | WHS | Disclaimer
                </div>
                <div className="flex space-x-4">
                   {/* Placeholder for Certification Logos */}
                   <div className="flex space-x-2 grayscale opacity-50">
                      <div className="bg-white text-black p-1 rounded font-bold text-[8px]">ACS</div>
                      <div className="bg-white text-black p-1 rounded font-bold text-[8px]">APSCo</div>
                      <div className="bg-white text-black p-1 rounded font-bold text-[8px]">RCSA</div>
                   </div>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}
