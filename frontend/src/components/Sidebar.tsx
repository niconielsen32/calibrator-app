
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  Book,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarItems = [
  {
    title: 'Calibration Images',
    href: '/images',
    icon: Upload,
    description: 'Upload and manage calibration images'
  },
  {
    title: 'Camera Calibration',
    href: '/calibration',
    icon: Camera,
    description: 'Configure and run calibration'
  },
  {
    title: '3D Visualization',
    href: '/visualization',
    icon: ImageIcon,
    description: 'View calibration results in 3D'
  },
  {
    title: 'Documentation',
    href: '/documentation',
    icon: Book,
    description: 'Guides and examples'
  }
];

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  return (
    <div className={cn("w-80 bg-slate-900 border-r border-slate-700 flex flex-col", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <div className="grid grid-cols-3 gap-1">
              <div className="w-2 h-2 bg-slate-900 rounded-sm"></div>
              <div className="w-2 h-2 bg-slate-900 rounded-sm"></div>
              <div className="w-2 h-2 bg-slate-900 rounded-sm"></div>
              <div className="w-2 h-2 bg-slate-900 rounded-sm"></div>
              <div className="w-2 h-2 bg-slate-300 rounded-sm"></div>
              <div className="w-2 h-2 bg-slate-900 rounded-sm"></div>
              <div className="w-2 h-2 bg-slate-900 rounded-sm"></div>
              <div className="w-2 h-2 bg-slate-900 rounded-sm"></div>
              <div className="w-2 h-2 bg-slate-900 rounded-sm"></div>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Calibrator</h1>
            <p className="text-sm text-slate-400">Camera Calibration App</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4">
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Steps
          </h2>
          <nav className="space-y-2">
            {sidebarItems.map((item, index) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    "hover:bg-slate-800 hover:text-white",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300"
                  )
                }
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-xs font-bold">
                    {index + 1}
                  </div>
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
