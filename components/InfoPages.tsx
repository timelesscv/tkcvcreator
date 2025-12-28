import React from 'react';
import { BackButton } from './ui/FormComponents';
import { Mail, Phone, Plane, Clock, Info, HelpCircle } from 'lucide-react';

export const HelpPage: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="max-w-4xl mx-auto px-4 pb-20 pt-20 animate-fade-in">
    <BackButton onClick={onBack} />
    <div className="text-center mb-10">
       <h1 className="text-4xl font-bold mb-2 text-accentHelp">❓ Help & Guidance</h1>
       <p className="text-slate-400">TK International CV Generator</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <div className="bg-secondary p-6 rounded-2xl border-l-4 border-accentHelp">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Info className="w-5 h-5"/> What This Tool Does</h3>
          <p className="text-slate-300 mb-4">A streamlined platform for generating country-specific employment CVs.</p>
          <ul className="list-disc list-inside text-slate-400 space-y-2">
             <li>Standardized formats for Kuwait, Saudi, Jordan</li>
             <li>Auto-calculations for age and salary</li>
             <li>One-click multi-PDF generation</li>
          </ul>
       </div>

       <div className="bg-secondary p-6 rounded-2xl border-l-4 border-accentHelp">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><HelpCircle className="w-5 h-5"/> Quick Start</h3>
          <ol className="list-decimal list-inside text-slate-400 space-y-2">
             <li>Select target country from dashboard</li>
             <li>Fill in candidate details</li>
             <li>Upload required photos</li>
             <li>Click Generate PDF button</li>
          </ol>
       </div>

       <div className="bg-secondary p-6 rounded-2xl border-l-4 border-accentHelp">
          <h3 className="text-xl font-bold mb-4">🔧 Troubleshooting</h3>
          <div className="text-slate-400 space-y-2">
             <p><strong>Photos:</strong> Use JPG/PNG under 5MB.</p>
             <p><strong>PDFs:</strong> Ensure all required fields are filled.</p>
             <p><strong>Issues:</strong> Refresh page or contact support.</p>
          </div>
       </div>
    </div>
  </div>
);

export const ContactPage: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="max-w-4xl mx-auto px-4 pb-20 pt-20 animate-fade-in">
    <BackButton onClick={onBack} />
    <div className="text-center mb-10">
       <h1 className="text-4xl font-bold mb-2 text-accentContact">📞 Contact Support</h1>
       <p className="text-slate-400">We're here to help you</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <div className="bg-secondary p-6 rounded-2xl border-l-4 border-accentContact">
          <h3 className="text-xl font-bold mb-6">Direct Contact</h3>
          <div className="space-y-4">
             <div className="flex items-center gap-4 p-3 bg-primary rounded-xl">
                <Mail className="w-6 h-6 text-accentContact"/>
                <div>
                   <div className="font-bold">Email</div>
                   <div className="text-slate-400">nathanasrat262@gmail.com</div>
                </div>
             </div>
             <div className="flex items-center gap-4 p-3 bg-primary rounded-xl">
                <Phone className="w-6 h-6 text-accentContact"/>
                <div>
                   <div className="font-bold">Phone</div>
                   <div className="text-slate-400">+251 95 211 9072</div>
                </div>
             </div>
             <div className="flex items-center gap-4 p-3 bg-primary rounded-xl">
                <Plane className="w-6 h-6 text-accentContact"/>
                <div>
                   <div className="font-bold">Telegram</div>
                   <div className="text-slate-400">@nathanasrat</div>
                </div>
             </div>
          </div>
       </div>

       <div className="bg-secondary p-6 rounded-2xl border-l-4 border-accentContact">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5"/> Support Hours</h3>
          <div className="text-slate-400 space-y-3">
             <p><strong>Mon - Fri:</strong> 8:00 AM - 6:00 PM EAT</p>
             <p><strong>Saturday:</strong> 9:00 AM - 2:00 PM EAT</p>
             <div className="p-3 bg-accentContact/10 text-accentContact rounded-lg mt-4">
                Emergency support available for critical issues
             </div>
          </div>
       </div>
    </div>
  </div>
);
