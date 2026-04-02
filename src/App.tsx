import React, { useState, useEffect, useRef } from 'react';
import { 
  Award,
  BookOpen,
  User, 
  Briefcase, 
  GraduationCap, 
  Wrench, 
  FolderKanban, 
  Layout as LayoutIcon,
  Download,
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileCode,
  Bold,
  List,
  ListOrdered,
  Italic,
  Link,
  Maximize2,
  Minimize2,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

import { CVData, TemplateType, Experience, Education } from './types';
import { cn } from './lib/utils';

// --- Components ---

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  onRemove: () => void;
  key?: any;
}

const SortableItem = ({ id, children, onRemove }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative bg-white border border-slate-200 rounded-lg p-4 mb-3 shadow-sm hover:border-blue-400 transition-colors">
      <div className="flex items-start gap-3">
        <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
          <GripVertical size={18} />
        </div>
        <div className="flex-1">
          {children}
        </div>
        <button 
          onClick={onRemove}
          className="text-slate-400 hover:text-red-500 transition-colors p-1"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

const Input = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input 
      {...props}
      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
    />
  </div>
);

const RichTextArea = ({ label, value, onChange, name }: { label: string, value: string, onChange: (e: any) => void, name?: string }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    
    onChange({ target: { name, value: newText } });
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const addBullet = () => insertText('\n• ');
  const addNumber = () => insertText('\n1. ');
  const addBold = () => insertText('**', '**');
  const addItalic = () => insertText('_', '_');
  const addLink = () => insertText('[', '](https://)');

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
          <button 
            type="button"
            onClick={addBold}
            className="p-1 hover:bg-white rounded text-slate-600 transition-colors" 
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button 
            type="button"
            onClick={addItalic}
            className="p-1 hover:bg-white rounded text-slate-600 transition-colors" 
            title="Italic"
          >
            <Italic size={14} />
          </button>
          <button 
            type="button"
            onClick={addLink}
            className="p-1 hover:bg-white rounded text-slate-600 transition-colors" 
            title="Link"
          >
            <Link size={14} />
          </button>
          <div className="w-px h-3 bg-slate-200 mx-0.5" />
          <button 
            type="button"
            onClick={addBullet}
            className="p-1 hover:bg-white rounded text-slate-600 transition-colors" 
            title="Bullet List"
          >
            <List size={14} />
          </button>
          <button 
            type="button"
            onClick={addNumber}
            className="p-1 hover:bg-white rounded text-slate-600 transition-colors" 
            title="Numbered List"
          >
            <ListOrdered size={14} />
          </button>
        </div>
      </div>
      <textarea 
        ref={textareaRef}
        value={value}
        onChange={onChange}
        name={name}
        rows={4}
        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-sans text-sm"
        placeholder="Use the toolbar above for formatting..."
      />
    </div>
  );
};

const MarkdownContent = ({ content, className }: { content: string, className?: string }) => (
  <div className={cn("markdown-content prose prose-sm max-w-none", className)}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
  </div>
);

// --- Main App ---

const initialData: CVData = {
  personalInfo: {
    fullName: 'John Doe',
    jobTitle: 'Software Engineer',
    email: 'john@example.com',
    phone: '+1 234 567 890',
    location: 'New York, USA',
    website: 'johndoe.dev',
    summary: 'Experienced software engineer with a passion for building scalable web applications and solving complex problems.',
    photo: ''
  },
  education: [
    { id: '1', school: 'University of Technology', degree: 'B.Sc. in Computer Science', startDate: '2015', endDate: '2019', description: 'Graduated with Honors.' }
  ],
  experience: [
    { id: '1', company: 'Tech Solutions Inc.', position: 'Senior Developer', startDate: '2020', endDate: 'Present', description: 'Leading the frontend team and architecting new features.' }
  ],
  skills: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'PostgreSQL'],
  customSections: []
};

export default function App() {
  const [cvData, setCvData] = useState<CVData>(() => {
    const saved = localStorage.getItem('cv-builder-data');
    if (!saved) return initialData;
    try {
      const parsed = JSON.parse(saved);
      // Merge with initialData to ensure all fields are present
      return {
        ...initialData,
        ...parsed,
        personalInfo: { ...initialData.personalInfo, ...parsed.personalInfo },
        // Ensure arrays are present and not undefined
        education: parsed.education || initialData.education,
        experience: parsed.experience || initialData.experience,
        skills: parsed.skills || initialData.skills,
        customSections: parsed.customSections || [],
      };
    } catch (e) {
      console.error('Error parsing saved CV data:', e);
      return initialData;
    }
  });
  const [activeStep, setActiveStep] = useState(0);
  const [template, setTemplate] = useState<TemplateType>('professional');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    localStorage.setItem('cv-builder-data', JSON.stringify(cvData));
  }, [cvData]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const steps = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Wrench },
    { id: 'additional', label: 'Additional', icon: Plus },
    { id: 'template', label: 'Template', icon: LayoutIcon },
  ];

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCvData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [name]: value }
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCvData(prev => ({
          ...prev,
          personalInfo: { ...prev.personalInfo, photo: reader.result as string }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = (type: 'experience' | 'education' | 'customSections') => {
    const id = Math.random().toString(36).substr(2, 9);
    if (type === 'customSections') {
      setCvData(prev => ({
        ...prev,
        customSections: [...prev.customSections, { id, title: 'New Section', items: [] }]
      }));
      return;
    }
    const newItem = {
      id,
      ...(type === 'experience' ? { company: '', position: '', startDate: '', endDate: '', description: '' } :
         { school: '', degree: '', startDate: '', endDate: '', description: '' })
    };
    setCvData(prev => ({
      ...prev,
      [type]: [...prev[type], newItem]
    }));
  };

  const removeItem = (type: 'experience' | 'education' | 'customSections', id: string) => {
    setCvData(prev => ({
      ...prev,
      [type]: (prev[type] as any[]).filter((item: any) => item.id !== id)
    }));
  };

  const updateItem = (type: 'experience' | 'education' | 'customSections', id: string, field: string, value: string) => {
    setCvData(prev => ({
      ...prev,
      [type]: (prev[type] as any[]).map((item: any) => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const addCustomItem = (sectionId: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setCvData(prev => ({
      ...prev,
      customSections: prev.customSections.map(s => 
        s.id === sectionId 
          ? { ...s, items: [...s.items, { id, title: '', subtitle: '', date: '', description: '' }] }
          : s
      )
    }));
  };

  const removeCustomItem = (sectionId: string, itemId: string) => {
    setCvData(prev => ({
      ...prev,
      customSections: prev.customSections.map(s => 
        s.id === sectionId 
          ? { ...s, items: s.items.filter(i => i.id !== itemId) }
          : s
      )
    }));
  };

  const updateCustomItem = (sectionId: string, itemId: string, field: string, value: any) => {
    setCvData(prev => ({
      ...prev,
      customSections: prev.customSections.map(s => 
        s.id === sectionId 
          ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, [field]: value } : i) }
          : s
      )
    }));
  };

  const handleDragEnd = (event: any, type: 'experience' | 'education' | 'customSections') => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setCvData((prev) => {
        const items = prev[type] as any[];
        const oldIndex = items.findIndex((item: any) => item.id === active.id);
        const newIndex = items.findIndex((item: any) => item.id === over.id);
        return {
          ...prev,
          [type]: arrayMove(items, oldIndex, newIndex),
        } as CVData;
      });
    }
  };

  const handleCustomItemDragEnd = (event: any, sectionId: string) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setCvData((prev) => ({
        ...prev,
        customSections: prev.customSections.map(s => {
          if (s.id === sectionId) {
            const oldIndex = s.items.findIndex(i => i.id === active.id);
            const newIndex = s.items.findIndex(i => i.id === over.id);
            return { ...s, items: arrayMove(s.items, oldIndex, newIndex) };
          }
          return s;
        })
      }));
    }
  };

  const handleSkillAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = (e.target as HTMLInputElement).value.trim();
      if (value && !cvData.skills.includes(value)) {
        setCvData(prev => ({ ...prev, skills: [...prev.skills, value] }));
        (e.target as HTMLInputElement).value = '';
      }
    }
  };

  const removeSkill = (skill: string) => {
    setCvData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const exportPDF = async () => {
    const element = document.getElementById('cv-preview');
    if (!element) return;
    
    // Temporarily remove scale and shadow for clean capture
    const originalStyle = element.style.transform;
    const originalShadow = element.style.boxShadow;
    const originalWidth = element.style.width;
    const originalMargin = element.style.margin;
    const originalHeight = element.style.height;
    
    element.style.transform = 'none';
    element.style.boxShadow = 'none';
    element.style.margin = '0';
    element.style.width = '210mm'; // Force A4 width
    element.style.height = 'auto'; // Ensure full height is captured
    element.style.minHeight = '297mm'; // Ensure at least one page

    try {
      // Small delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        y: 0,
        scrollY: 0
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Add subsequent pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      pdf.save(`${cvData.personalInfo.fullName.replace(/\s+/g, '_')}_CV.pdf`);
    } catch (error) {
      console.error('PDF Export failed:', error);
    } finally {
      // Restore styles
      element.style.transform = originalStyle;
      element.style.boxShadow = originalShadow;
      element.style.width = originalWidth;
      element.style.margin = originalMargin;
      element.style.height = originalHeight;
    }
  };

  const exportWord = async () => {
    const parseMarkdown = (text: string) => {
      const lines = text.split('\n').filter(l => l.trim() !== '');
      return lines.map(line => {
        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ');
        const cleanLine = line.trim().replace(/^([-*•])\s+/, '');
        
        return new Paragraph({
          children: [new TextRun({ text: cleanLine })],
          bullet: isBullet ? { level: 0 } : undefined,
          spacing: { after: 120, line: 360 }
        });
      });
    };

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          // Header
          new Paragraph({
            text: cvData.personalInfo.fullName,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: cvData.personalInfo.jobTitle, bold: true, color: "2563EB", size: 28 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${cvData.personalInfo.email}  |  ${cvData.personalInfo.phone}  |  ${cvData.personalInfo.location}`, size: 20, color: "64748B" }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),

          // Summary
          new Paragraph({ 
            children: [new TextRun({ text: "PROFESSIONAL SUMMARY", bold: true, size: 24 })],
            border: { bottom: { color: "2563EB", space: 1, style: BorderStyle.SINGLE, size: 6 } },
            spacing: { before: 400, after: 200 }
          }),
          ...parseMarkdown(cvData.personalInfo.summary),
          
          // Experience
          new Paragraph({ 
            children: [new TextRun({ text: "WORK EXPERIENCE", bold: true, size: 24 })],
            border: { bottom: { color: "2563EB", space: 1, style: BorderStyle.SINGLE, size: 6 } },
            spacing: { before: 400, after: 200 }
          }),
          ...cvData.experience.flatMap(exp => [
            new Paragraph({
              children: [
                new TextRun({ text: exp.position, bold: true, size: 22 }),
                new TextRun({ text: `\t${exp.startDate} — ${exp.endDate}`, bold: true, color: "94A3B8" }),
              ],
              tabStops: [{ type: "right", position: 9000 }],
              spacing: { before: 200 }
            }),
            new Paragraph({
              children: [new TextRun({ text: exp.company, bold: true, color: "2563EB" })],
              spacing: { after: 120 }
            }),
            ...parseMarkdown(exp.description)
          ]),

          // Education
          new Paragraph({ 
            children: [new TextRun({ text: "EDUCATION", bold: true, size: 24 })],
            border: { bottom: { color: "2563EB", space: 1, style: BorderStyle.SINGLE, size: 6 } },
            spacing: { before: 400, after: 200 }
          }),
          ...cvData.education.flatMap(edu => [
            new Paragraph({
              children: [
                new TextRun({ text: edu.degree, bold: true, size: 22 }),
                new TextRun({ text: `\t${edu.startDate} — ${edu.endDate}`, bold: true, color: "94A3B8" }),
              ],
              tabStops: [{ type: "right", position: 9000 }],
              spacing: { before: 200 }
            }),
            new Paragraph({
              children: [new TextRun({ text: edu.school, bold: true, color: "2563EB" })],
              spacing: { after: 120 }
            }),
            ...parseMarkdown(edu.description)
          ]),

          // Skills
          new Paragraph({ 
            children: [new TextRun({ text: "SKILLS", bold: true, size: 24 })],
            border: { bottom: { color: "2563EB", space: 1, style: BorderStyle.SINGLE, size: 6 } },
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({ 
            text: cvData.skills.join(" • "),
            spacing: { after: 200 }
          }),

          // Custom Sections
          ...cvData.customSections.flatMap(section => [
            new Paragraph({ 
              children: [new TextRun({ text: section.title.toUpperCase(), bold: true, size: 24 })],
              border: { bottom: { color: "2563EB", space: 1, style: BorderStyle.SINGLE, size: 6 } },
              spacing: { before: 400, after: 200 }
            }),
            ...section.items.flatMap(item => [
              new Paragraph({
                children: [
                  new TextRun({ text: item.title, bold: true, size: 22 }),
                  ...(item.date ? [new TextRun({ text: `\t${item.date}`, bold: true, color: "94A3B8" })] : []),
                ],
                tabStops: [{ type: "right", position: 9000 }],
                spacing: { before: 200 }
              }),
              ...(item.subtitle ? [
                new Paragraph({
                  children: [new TextRun({ text: item.subtitle, bold: true, color: "2563EB" })],
                  spacing: { after: 120 }
                })
              ] : []),
              ...parseMarkdown(item.description)
            ])
          ]),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${cvData.personalInfo.fullName.replace(/\s+/g, '_')}_CV.docx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <FileText size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">CV Builder</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium",
              isPreviewMode ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {isPreviewMode ? <Minimize2 size={18} /> : <Eye size={18} />}
            <span>{isPreviewMode ? 'Edit Mode' : 'Review Mode'}</span>
          </button>
          <button 
            onClick={exportWord}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            <FileCode size={18} />
            <span className="hidden sm:inline">Word</span>
          </button>
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-sm"
          >
            <Download size={18} />
            <span>Download PDF</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Form */}
        <div className={cn(
          "w-full lg:w-1/2 flex flex-col bg-white border-r border-slate-200 transition-all duration-500",
          isPreviewMode ? "-translate-x-full opacity-0 pointer-events-none absolute" : "translate-x-0 opacity-100"
        )}>
          {/* Steps Navigation */}
          <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(index)}
                className={cn(
                  "flex-1 min-w-[100px] py-4 px-2 flex flex-col items-center gap-1 transition-all relative",
                  activeStep === index ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <step.icon size={20} />
                <span className="text-xs font-medium">{step.label}</span>
                {activeStep === index && (
                  <motion.div 
                    layoutId="activeStep"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-2xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeStep === 0 && (
                  <section>
                    <h2 className="text-2xl font-bold mb-6">Personal Information</h2>
                    <div className="flex flex-col sm:flex-row gap-6 mb-6">
                      <div className="flex-shrink-0">
                        <div className="relative w-32 h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden group">
                          {cvData.personalInfo.photo ? (
                            <img src={cvData.personalInfo.photo} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <ImageIcon className="text-slate-400 mb-1" size={24} />
                              <span className="text-[10px] text-slate-500 font-medium">Upload Photo</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handlePhotoUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          {cvData.personalInfo.photo && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-medium">Change</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-1 gap-4">
                        <Input 
                          label="Full Name" 
                          name="fullName" 
                          value={cvData.personalInfo.fullName} 
                          onChange={handlePersonalInfoChange} 
                          placeholder="e.g. John Doe"
                        />
                        <Input 
                          label="Job Title" 
                          name="jobTitle" 
                          value={cvData.personalInfo.jobTitle} 
                          onChange={handlePersonalInfoChange} 
                          placeholder="e.g. Software Engineer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Email" name="email" value={cvData.personalInfo.email} onChange={handlePersonalInfoChange} type="email" />
                      <Input label="Phone" name="phone" value={cvData.personalInfo.phone} onChange={handlePersonalInfoChange} />
                      <Input label="Location" name="location" value={cvData.personalInfo.location} onChange={handlePersonalInfoChange} />
                      <Input label="Website" name="website" value={cvData.personalInfo.website} onChange={handlePersonalInfoChange} />
                    </div>
                    <RichTextArea 
                      label="Professional Summary" 
                      name="summary" 
                      value={cvData.personalInfo.summary} 
                      onChange={handlePersonalInfoChange} 
                    />
                  </section>
                )}

                {activeStep === 1 && (
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold">Work Experience</h2>
                      <button 
                        onClick={() => addItem('experience')}
                        className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold"
                      >
                        <Plus size={18} />
                        Add Experience
                      </button>
                    </div>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'experience')}>
                      <SortableContext items={cvData.experience.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        {cvData.experience.map((exp) => (
                          <SortableItem key={exp.id} id={exp.id} onRemove={() => removeItem('experience', exp.id)}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <Input label="Company" value={exp.company} onChange={(e) => updateItem('experience', exp.id, 'company', e.target.value)} />
                              <Input label="Position" value={exp.position} onChange={(e) => updateItem('experience', exp.id, 'position', e.target.value)} />
                              <Input label="Start Date" value={exp.startDate} onChange={(e) => updateItem('experience', exp.id, 'startDate', e.target.value)} />
                              <Input label="End Date" value={exp.endDate} onChange={(e) => updateItem('experience', exp.id, 'endDate', e.target.value)} />
                            </div>
                            <RichTextArea 
                              label="Description" 
                              value={exp.description} 
                              onChange={(e) => updateItem('experience', exp.id, 'description', e.target.value)} 
                            />
                          </SortableItem>
                        ))}
                      </SortableContext>
                    </DndContext>
                  </section>
                )}

                {activeStep === 2 && (
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold">Education</h2>
                      <button 
                        onClick={() => addItem('education')}
                        className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold"
                      >
                        <Plus size={18} />
                        Add Education
                      </button>
                    </div>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'education')}>
                      <SortableContext items={cvData.education.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        {cvData.education.map((edu) => (
                          <SortableItem key={edu.id} id={edu.id} onRemove={() => removeItem('education', edu.id)}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <Input label="School / University" value={edu.school} onChange={(e) => updateItem('education', edu.id, 'school', e.target.value)} />
                              <Input label="Degree" value={edu.degree} onChange={(e) => updateItem('education', edu.id, 'degree', e.target.value)} />
                              <Input label="Start Date" value={edu.startDate} onChange={(e) => updateItem('education', edu.id, 'startDate', e.target.value)} />
                              <Input label="End Date" value={edu.endDate} onChange={(e) => updateItem('education', edu.id, 'endDate', e.target.value)} />
                            </div>
                            <RichTextArea 
                              label="Description" 
                              value={edu.description} 
                              onChange={(e) => updateItem('education', edu.id, 'description', e.target.value)} 
                            />
                          </SortableItem>
                        ))}
                      </SortableContext>
                    </DndContext>
                  </section>
                )}

                {activeStep === 3 && (
                  <section>
                    <h2 className="text-2xl font-bold mb-6">Skills</h2>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Add Skills (Press Enter)</label>
                      <input 
                        type="text"
                        onKeyDown={handleSkillAdd}
                        placeholder="e.g. React, Project Management..."
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cvData.skills.map((skill) => (
                        <span 
                          key={skill} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100 group"
                        >
                          {skill}
                          <button onClick={() => removeSkill(skill)} className="text-blue-400 hover:text-blue-600">
                            <Trash2 size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {activeStep === 4 && (
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold">Additional Sections</h2>
                      <button 
                        onClick={() => addItem('customSections')}
                        className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold"
                      >
                        <Plus size={18} />
                        Add Section
                      </button>
                    </div>
                    
                    <div className="space-y-8">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'customSections')}>
                        <SortableContext items={cvData.customSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                          {cvData.customSections.map((section) => (
                            <SortableItem key={section.id} id={section.id} onRemove={() => removeItem('customSections', section.id)}>
                              <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Section Title</label>
                                <input 
                                  type="text"
                                  value={section.title}
                                  onChange={(e) => updateItem('customSections', section.id, 'title', e.target.value)}
                                  placeholder="e.g. Certifications, Projects, Volunteer Work"
                                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                />
                              </div>

                              <div className="space-y-4">
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleCustomItemDragEnd(e, section.id)}>
                                  <SortableContext items={section.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                    {section.items.map((item) => (
                                      <SortableItem key={item.id} id={item.id} onRemove={() => removeCustomItem(section.id, item.id)}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                          <Input 
                                            label="Title" 
                                            value={item.title} 
                                            onChange={(e) => updateCustomItem(section.id, item.id, 'title', e.target.value)} 
                                            placeholder="e.g. AWS Certified"
                                          />
                                          <Input 
                                            label="Subtitle / Organization" 
                                            value={item.subtitle || ''} 
                                            onChange={(e) => updateCustomItem(section.id, item.id, 'subtitle', e.target.value)} 
                                            placeholder="e.g. Amazon Web Services"
                                          />
                                          <Input 
                                            label="Date" 
                                            value={item.date || ''} 
                                            onChange={(e) => updateCustomItem(section.id, item.id, 'date', e.target.value)} 
                                            placeholder="e.g. 2023"
                                          />
                                        </div>
                                        <RichTextArea 
                                          label="Description" 
                                          value={item.description} 
                                          onChange={(e) => updateCustomItem(section.id, item.id, 'description', e.target.value)} 
                                        />
                                      </SortableItem>
                                    ))}
                                  </SortableContext>
                                </DndContext>
                                
                                <button 
                                  onClick={() => addCustomItem(section.id)}
                                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-sm font-bold"
                                >
                                  <Plus size={16} />
                                  Add Item to {section.title}
                                </button>
                              </div>
                            </SortableItem>
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>

                    {cvData.customSections.length === 0 && (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <Plus className="mx-auto text-slate-300 mb-3" size={32} />
                        <p className="text-slate-500 font-medium">No additional sections yet.</p>
                        <p className="text-slate-400 text-sm">Add sections for Projects, Certifications, or anything else.</p>
                      </div>
                    )}
                  </section>
                )}

                {activeStep === 5 && (
                  <section>
                    <h2 className="text-2xl font-bold mb-6">Choose Template</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {(['minimalist', 'professional', 'creative'] as TemplateType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTemplate(t)}
                          className={cn(
                            "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                            template === t ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-slate-300 bg-white"
                          )}
                        >
                          <div className={cn(
                            "w-full aspect-[1/1.4] rounded-lg shadow-sm mb-2",
                            t === 'minimalist' ? "bg-white border border-slate-200" :
                            t === 'professional' ? "bg-slate-800" : "bg-gradient-to-br from-purple-500 to-blue-500"
                          )} />
                          <span className="capitalize font-semibold">{t}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-12 flex items-center justify-between pt-8 border-t border-slate-100">
              <button
                onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                disabled={activeStep === 0}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 disabled:opacity-30 font-medium"
              >
                <ChevronLeft size={20} />
                Previous
              </button>
              <button
                onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
                disabled={activeStep === steps.length - 1}
                className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg disabled:opacity-30 font-medium"
              >
                Next
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Preview */}
        <div className={cn(
          "flex-1 bg-slate-100 p-6 lg:p-10 overflow-y-auto flex flex-col items-center transition-all duration-500",
          isPreviewMode ? "w-full" : "hidden lg:flex"
        )}>
          {/* Floating Download Bar in Review Mode */}
          <AnimatePresence>
            {isPreviewMode && (
              <motion.div 
                initial={{ y: 100, opacity: 0, x: '-50%' }}
                animate={{ y: 0, opacity: 1, x: '-50%' }}
                exit={{ y: 100, opacity: 0, x: '-50%' }}
                className="fixed bottom-10 left-1/2 z-[60] bg-white/90 backdrop-blur-xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl p-3 flex items-center gap-3 min-w-[320px]"
              >
                <div className="px-4 py-2 border-r border-slate-100 mr-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Download CV</span>
                </div>
                <button 
                  onClick={exportWord}
                  className="flex items-center gap-2 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-all font-bold text-sm group"
                >
                  <FileCode size={20} className="text-blue-600 group-hover:scale-110 transition-transform" />
                  <span>Word</span>
                </button>
                <button 
                  onClick={exportPDF}
                  className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all font-bold text-sm shadow-xl shadow-blue-200 group"
                >
                  <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                  <span>PDF Document</span>
                </button>
                <button 
                  onClick={() => setIsPreviewMode(false)}
                  className="ml-2 p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                  title="Back to Edit"
                >
                  <Minimize2 size={22} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div 
            id="cv-preview" 
            className={cn(
              "cv-preview-container origin-top transition-all duration-500 mb-24",
              isPreviewMode ? "scale-100 max-w-4xl" : "scale-90 xl:scale-100"
            )}
          >
            {template === 'minimalist' && <MinimalistTemplate data={cvData} />}
            {template === 'professional' && <ProfessionalTemplate data={cvData} />}
            {template === 'creative' && <CreativeTemplate data={cvData} />}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Templates ---

const MinimalistTemplate = ({ data }: { data: CVData }) => (
  <div className="min-h-[297mm] p-12 text-slate-800 font-sans leading-relaxed bg-white">
    <header className="mb-10 border-b-2 border-slate-900 pb-8">
      <h1 className="text-4xl font-bold tracking-tighter uppercase mb-2 text-slate-900">{data.personalInfo.fullName}</h1>
      <p className="text-xl text-slate-600 font-medium tracking-wide">{data.personalInfo.jobTitle}</p>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500 font-medium">
        <span className="flex items-center gap-1.5"><FileText size={14} /> {data.personalInfo.email}</span>
        <span className="flex items-center gap-1.5">{data.personalInfo.phone}</span>
        <span className="flex items-center gap-1.5">{data.personalInfo.location}</span>
        {data.personalInfo.website && <span className="flex items-center gap-1.5 text-blue-600 underline decoration-blue-200 underline-offset-4">{data.personalInfo.website}</span>}
      </div>
    </header>

    <div className="grid grid-cols-1 gap-10">
      <section>
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 border-b border-slate-100 pb-2">Professional Summary</h2>
        <MarkdownContent content={data.personalInfo.summary} className="text-sm text-slate-700 leading-relaxed" />
      </section>

      <section>
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 border-b border-slate-100 pb-2">Work Experience</h2>
        <div className="space-y-8">
          {data.experience.map(exp => (
            <div key={exp.id}>
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-bold text-base text-slate-900">{exp.position}</h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">{exp.startDate} — {exp.endDate}</span>
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-3">{exp.company}</p>
              <MarkdownContent content={exp.description} className="text-sm text-slate-500 leading-relaxed" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <section>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 border-b border-slate-100 pb-2">Education</h2>
          <div className="space-y-6">
            {data.education.map(edu => (
              <div key={edu.id}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-sm text-slate-900">{edu.degree}</h3>
                  <span className="text-[10px] font-bold text-slate-400">{edu.startDate} — {edu.endDate}</span>
                </div>
                <p className="text-xs text-slate-600 mb-1">{edu.school}</p>
                <MarkdownContent content={edu.description} className="text-xs text-slate-500" />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 border-b border-slate-100 pb-2">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {data.skills.map(skill => (
              <span key={skill} className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">{skill}</span>
            ))}
          </div>
        </section>
      </div>

      {data.customSections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {data.customSections.map(section => (
            <section key={section.id}>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 border-b border-slate-100 pb-2">{section.title}</h2>
              <div className="space-y-4">
                {section.items.map(item => (
                  <div key={item.id}>
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                      {item.date && <span className="text-[10px] font-bold text-slate-400">{item.date}</span>}
                    </div>
                    {item.subtitle && <p className="text-xs text-slate-600 mb-1">{item.subtitle}</p>}
                    <MarkdownContent content={item.description} className="text-xs text-slate-500" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  </div>
);

const ProfessionalTemplate = ({ data }: { data: CVData }) => (
  <div className="min-h-[297mm] flex text-slate-800 font-sans bg-white">
    <div className="w-1/3 bg-slate-900 text-white p-8 flex flex-col">
      {data.personalInfo.photo && (
        <div className="w-full aspect-square rounded-2xl overflow-hidden mb-8 border-4 border-slate-800 shadow-2xl">
          <img src={data.personalInfo.photo} alt="Profile" className="w-full h-full object-cover" />
        </div>
      )}
      
      <section className="mb-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-4 opacity-80">Contact</h2>
        <div className="space-y-4 text-xs text-slate-300 font-medium">
          <p className="flex items-center gap-2 break-all"><FileText size={12} className="text-blue-400" /> {data.personalInfo.email}</p>
          <p className="flex items-center gap-2"><Briefcase size={12} className="text-blue-400" /> {data.personalInfo.phone}</p>
          <p className="flex items-center gap-2"><LayoutIcon size={12} className="text-blue-400" /> {data.personalInfo.location}</p>
          {data.personalInfo.website && <p className="flex items-center gap-2 break-all text-blue-300">{data.personalInfo.website}</p>}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-4 opacity-80">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {data.skills.map(skill => (
            <span key={skill} className="text-[10px] font-bold bg-slate-800 text-slate-200 px-2.5 py-1.5 rounded-md border border-slate-700">{skill}</span>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-4 opacity-80">Education</h2>
        <div className="space-y-6">
          {data.education.map(edu => (
            <div key={edu.id}>
              <p className="font-bold text-sm mb-1 text-white leading-tight">{edu.degree}</p>
              <p className="text-xs text-slate-400 mb-1">{edu.school}</p>
              <p className="text-[10px] font-bold text-slate-500">{edu.startDate} - {edu.endDate}</p>
            </div>
          ))}
        </div>
      </section>
    </div>

    <div className="flex-1 p-12 bg-white flex flex-col">
      <header className="mb-12">
        <h1 className="text-5xl font-black text-slate-900 mb-2 tracking-tight">{data.personalInfo.fullName}</h1>
        <p className="text-xl text-blue-600 font-bold tracking-wide">{data.personalInfo.jobTitle}</p>
      </header>

      <div className="space-y-12">
        <section>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 border-b-2 border-blue-600 pb-1.5 mb-5">Professional Summary</h2>
          <MarkdownContent content={data.personalInfo.summary} className="text-sm leading-relaxed text-slate-600 font-medium" />
        </section>

        <section>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 border-b-2 border-blue-600 pb-1.5 mb-5">Work Experience</h2>
          <div className="space-y-10">
            {data.experience.map(exp => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="font-bold text-lg text-slate-900">{exp.position}</h3>
                  <span className="text-xs font-black text-slate-400 bg-slate-50 px-2 py-1 rounded">{exp.startDate} — {exp.endDate}</span>
                </div>
                <p className="text-sm font-bold text-blue-600 mb-3">{exp.company}</p>
                <MarkdownContent content={exp.description} className="text-sm text-slate-600 leading-relaxed" />
              </div>
            ))}
          </div>
        </section>

        {data.customSections.map(section => (
          <section key={section.id}>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 border-b-2 border-blue-600 pb-1.5 mb-5">{section.title}</h2>
            <div className="space-y-8">
              {section.items.map(item => (
                <div key={item.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                    {item.date && <span className="text-[10px] font-bold text-slate-400">{item.date}</span>}
                  </div>
                  {item.subtitle && <p className="text-xs font-bold text-blue-600 mb-2">{item.subtitle}</p>}
                  <MarkdownContent content={item.description} className="text-xs text-slate-600" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  </div>
);

const CreativeTemplate = ({ data }: { data: CVData }) => (
  <div className="min-h-[297mm] bg-white text-slate-800 font-sans overflow-hidden relative">
    <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />
    
    <div className="relative px-12 pt-24 pb-12">
      <div className="bg-white rounded-3xl shadow-2xl p-10 mb-10 flex flex-col md:flex-row gap-10 items-center md:items-end border border-slate-100">
        {data.personalInfo.photo && (
          <div className="w-36 h-36 rounded-2xl overflow-hidden shadow-2xl -mt-24 border-4 border-white">
            <img src={data.personalInfo.photo} alt="Profile" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2">{data.personalInfo.fullName}</h1>
          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 tracking-wide">{data.personalInfo.jobTitle}</p>
        </div>
        <div className="flex flex-col gap-2 text-right text-xs font-bold text-slate-400">
          <span className="flex items-center justify-end gap-2">{data.personalInfo.email} <FileText size={14} /></span>
          <span className="flex items-center justify-end gap-2">{data.personalInfo.phone} <Briefcase size={14} /></span>
          <span className="flex items-center justify-end gap-2">{data.personalInfo.location} <LayoutIcon size={14} /></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-2 space-y-12">
          <section>
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <span className="w-10 h-1.5 bg-indigo-600 rounded-full" />
              Professional Experience
            </h2>
            <div className="space-y-10 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 pl-8">
              {data.experience.map(exp => (
                <div key={exp.id} className="relative">
                  <div className="absolute -left-[35px] top-1.5 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-md" />
                  <div className="mb-3">
                    <h3 className="font-bold text-lg text-slate-900">{exp.position}</h3>
                    <p className="text-sm font-bold text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded">{exp.company} | {exp.startDate} — {exp.endDate}</p>
                  </div>
                  <MarkdownContent content={exp.description} className="text-sm text-slate-600 leading-relaxed" />
                </div>
              ))}
            </div>
          </section>

          {data.customSections.map((section, idx) => (
            <section key={section.id}>
              <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <span className={cn(
                  "w-10 h-1.5 rounded-full",
                  idx % 3 === 0 ? "bg-indigo-600" : idx % 3 === 1 ? "bg-blue-600" : "bg-cyan-500"
                )} />
                {section.title}
              </h2>
              <div className="space-y-6">
                {section.items.map(item => (
                  <div key={item.id} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-900">{item.title}</h3>
                      {item.date && <span className="text-[10px] font-bold text-slate-400">{item.date}</span>}
                    </div>
                    {item.subtitle && <p className="text-xs font-bold text-indigo-600 mb-2">{item.subtitle}</p>}
                    <MarkdownContent content={item.description} className="text-xs text-slate-600 leading-relaxed" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-black text-slate-900 mb-6">About Me</h2>
            <MarkdownContent content={data.personalInfo.summary} className="text-sm text-slate-600 leading-relaxed font-medium" />
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-6">Core Skills</h2>
            <div className="flex flex-wrap gap-2">
              {data.skills.map(skill => (
                <span key={skill} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg hover:scale-105 transition-transform">{skill}</span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-6">Education</h2>
            <div className="space-y-6">
              {data.education.map(edu => (
                <div key={edu.id} className="relative pl-4 border-l-2 border-indigo-100">
                  <p className="font-bold text-sm text-slate-900 mb-1">{edu.degree}</p>
                  <p className="text-xs font-bold text-slate-400 mb-1">{edu.school}</p>
                  <p className="text-[10px] font-bold text-indigo-300">{edu.startDate} — {edu.endDate}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
);
