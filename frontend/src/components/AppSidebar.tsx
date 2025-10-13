import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Camera, 
  BarChart3, 
  FileText,
  Grid3X3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const navigationItems = [
  {
    title: 'Camera Calibration',
    href: '/calibration',
    icon: Camera,
    pattern: /^\/calibration/
  },
  {
    title: 'Results',
    href: '/results',
    icon: BarChart3,
    pattern: /^\/results/
  },
  {
    title: 'Documentation',
    href: '/documentation',
    icon: FileText,
    pattern: /^\/documentation/
  }
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={cn(
      "flex flex-col gap-y-5 bg-[#292524] border-r border-stone-700 transition-all duration-200 relative",
      collapsed ? "w-[80px]" : "w-[280px]"
    )}>
      {/* Toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-4 top-6 h-8 w-8 rounded-full border border-stone-700 bg-[#292524] text-stone-400 hover:bg-[#2a2522] hover:text-stone-200 z-50"
        onClick={toggleSidebar}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {/* App Logo/Title */}
      <div className="flex items-center px-5 pt-5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-stone-800 flex-shrink-0">
          <Grid3X3 className="w-6 h-6 text-stone-100" />
        </div>
        <div className={cn(
          "ml-3 overflow-hidden transition-all duration-200",
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        )}>
          <h1 className="text-xl font-semibold text-stone-100 whitespace-nowrap">Calibrator</h1>
          <p className="text-sm text-stone-400 whitespace-nowrap">Professional Camera Calibration</p>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="space-y-6 flex-1 px-3">
        <div>
          <h2 className={cn(
            "px-2 text-xs font-semibold text-stone-400 uppercase tracking-wider transition-opacity duration-200",
            collapsed ? "opacity-0 h-0" : "opacity-100 h-auto mb-3"
          )}>
            WORKFLOW
          </h2>
          <div className="mt-3 space-y-1">
            {navigationItems.map((item) => {
              const isActive = item.pattern.test(location.pathname);
              return (
                <Link
                  key={item.title}
                  to={item.href}
                  className="group relative"
                  title={collapsed ? item.title : undefined}
                >
                  <div
                    className={cn(
                      "absolute left-0 w-1 h-8 rounded-r-full transition-all duration-300",
                      isActive ? "bg-green-500" : "bg-transparent group-hover:bg-stone-600"
                    )}
                  />
                  <div
                    className={cn(
                      "flex items-center rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-[#2a2522] text-stone-100"
                        : "text-stone-400 hover:bg-[#2a2522]/60 hover:text-stone-200"
                    )}
                  >
                    <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
                      <item.icon
                        className={cn(
                          "w-5 h-5 transition-colors duration-200",
                          isActive ? "text-green-500" : "text-stone-400 group-hover:text-stone-300"
                        )}
                      />
                    </div>
                    <span className={cn(
                      "font-medium transition-all duration-200 overflow-hidden whitespace-nowrap",
                      collapsed ? "w-0 opacity-0" : "w-auto opacity-100 mr-3"
                    )}>
                      {item.title}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
