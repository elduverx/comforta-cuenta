"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Settings2, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CircleUser
} from "lucide-react";

// Interface para TypeScript
interface PlatformData {
  invoiced: number;
  cash: number;
  bonuses: number;
  cobradoABordo?: number | null;
}
interface Driver {
  id: string;
  name: string;
  initials: string;
  admin?: string;
  dateRange?: string;
  photoUrl?: string;
  platforms: Record<string, PlatformData>;
}

// Helper to calculate totals for a driver
const calculateTotals = (platforms: Record<string, PlatformData>) => {
  const platformsList = ['uber', 'cabify', 'bolt', 'privados'];
  let totalBruto = 0;
  let totalEfectivo = 0;

  platformsList.forEach((p) => {
    if (platforms[p]) {
      totalBruto += platforms[p].invoiced;
      if (p === 'cabify' && platforms[p].cobradoABordo !== null && platforms[p].cobradoABordo !== undefined) {
        totalEfectivo += platforms[p].cobradoABordo;
      } else {
        totalEfectivo += platforms[p].cash;
      }
    }
  });

  // Ingreso Neto Admin (65% del total bruto es para la empresa/dueño del vehículo)
  const ingresoNetoAdmin = totalBruto * 0.65; 
  
  // Ingreso Neto Flota/Conductor (35% del total bruto)
  const gananciaConductor = totalBruto * 0.35; 
  
  // Balance final (lo que le toca al conductor menos el efectivo que ya tiene en su bolsillo)
  const balanceFinal = gananciaConductor - totalEfectivo; 

  return { totalBruto, totalEfectivo, ingresoNetoAdmin, gananciaConductor, balanceFinal };
};

import { addWeeks, subWeeks, format, startOfWeek, endOfWeek, addMonths, subMonths, getISOWeek } from "date-fns";
import { es } from "date-fns/locale";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import * as XLSX from 'xlsx';

export default function UberStyleDashboard() {
  const [currentProfile, setCurrentProfile] = useState("Oscar");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [driversData, setDriversData] = useState<Driver[]>([]);
  const [masterDrivers, setMasterDrivers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Liquidaciones");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});


  useEffect(() => {
    const fetchMaster = () => {
      fetch(`/api/drivers?type=master&admin=${currentProfile}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setMasterDrivers(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev);
          }
        })
        .catch(err => console.error("Error fetching master drivers", err));
    };
    
    fetchMaster();
    const interval = setInterval(fetchMaster, 3000);
    return () => clearInterval(interval);
  }, [currentProfile]);

  // Calendar State
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'custom'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Custom range using Pro Calendar
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 })
  });

  const exportToExcel = () => {
    if (!driversData || driversData.length === 0) {
      alert("No hay datos para exportar en el rango seleccionado.");
      return;
    }

    const dataToExport = driversData.map(driver => {
      const totals = calculateTotals(driver.platforms);
      return {
        "Nombre del Conductor": driver.name,
        "Total Bruto": totals.totalBruto,
        "Total Efectivo": totals.totalEfectivo,
        "Admin (65%)": totals.ingresoNetoAdmin,
        "Flota (35%)": totals.gananciaConductor,
        "Balance Final": totals.balanceFinal,
        "Uber - Bruto": driver.platforms.uber ? driver.platforms.uber.invoiced : 0,
        "Uber - Efectivo": driver.platforms.uber ? driver.platforms.uber.cash : 0,
        "Cabify - Bruto": driver.platforms.cabify ? driver.platforms.cabify.invoiced : 0,
        "Cabify - Efectivo": driver.platforms.cabify ? driver.platforms.cabify.cash : 0,
        "Cabify - Cobrado a bordo": (driver.platforms.cabify && driver.platforms.cabify.cobradoABordo !== null && driver.platforms.cabify.cobradoABordo !== undefined) ? driver.platforms.cabify.cobradoABordo : '-',
        "Bolt - Bruto": driver.platforms.bolt ? driver.platforms.bolt.invoiced : 0,
        "Bolt - Efectivo": driver.platforms.bolt ? driver.platforms.bolt.cash : 0,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Auto-ajustar columnas
    const colWidths = [
      { wch: 30 }, // Nombre
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, // Totales
      { wch: 15 }, { wch: 15 }, // Uber
      { wch: 15 }, { wch: 15 }, { wch: 22 }, // Cabify
      { wch: 15 }, { wch: 15 } // Bolt
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Liquidaciones");
    
    let fromDate = "fecha";
    let toDate = "fecha";
    if (selectedRange?.from) fromDate = format(selectedRange.from, 'dd-MM-yyyy');
    if (selectedRange?.to) toDate = format(selectedRange.to, 'dd-MM-yyyy');
    
    const fileName = `Reporte_${currentProfile}_${fromDate}_al_${toDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  useEffect(() => {
    if (viewMode === 'week') {
      setSelectedRange({
        from: startOfWeek(currentDate, { weekStartsOn: 1 }),
        to: endOfWeek(currentDate, { weekStartsOn: 1 })
      });
    } else if (viewMode === 'month') {
      const from = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const to = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      setSelectedRange({ from, to });
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    if (!selectedRange?.from || !selectedRange?.to) return;
    
    const fetchDrivers = () => {
      const sStr = format(selectedRange.from!, 'yyyy-MM-dd');
      const eStr = format(selectedRange.to!, 'yyyy-MM-dd');
      fetch(`/api/drivers?start=${sStr}&end=${eStr}&admin=${currentProfile}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setDriversData(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev);
          }
        })
        .catch(err => console.error("Error fetching drivers", err));
    };

    fetchDrivers();
    const interval = setInterval(fetchDrivers, 3000);
    return () => clearInterval(interval);
  }, [selectedRange, currentProfile]);

  const tabs = [
    "Inicio", "Liquidaciones", "Socios conductores", "Vehículos", "Reportes"
  ];

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNextPeriod = () => {
    if (viewMode === 'custom') return;
    setCurrentDate(prev => viewMode === 'week' ? addWeeks(prev, 1) : addMonths(prev, 1));
  };

  const handlePrevPeriod = () => {
    if (viewMode === 'custom') return;
    setCurrentDate(prev => viewMode === 'week' ? subWeeks(prev, 1) : subMonths(prev, 1));
  };

  const getDateDisplayText = () => {
    if (viewMode === 'custom' && selectedRange?.from) {
      const start = selectedRange.from;
      const end = selectedRange.to || selectedRange.from;
      return `${format(start, "d 'de' MMM", { locale: es })} - ${format(end, "d 'de' MMM, yyyy", { locale: es })}`;
    }
    
    if (viewMode === 'month') {
      return format(currentDate, "MMMM, yyyy", { locale: es });
    }

    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(start, "d 'de' MMM", { locale: es })} - ${format(end, "d 'de' MMM, yyyy", { locale: es })}`;
  };

  const applyCustomRange = () => {
    setViewMode('custom');
    setIsCalendarOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Top Navbar */}
      <header className="border-b border-gray-200">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-4">
            <div className="bg-black text-white px-3 py-1 font-bold text-xl tracking-tighter">Comforta</div>
            <span className="text-gray-400">|</span>
            <span className="font-medium text-gray-700">Flotas</span>
          </div>
          <div className="flex items-center gap-4 relative">
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors font-semibold"
            >
              <CircleUser className="w-6 h-6 text-gray-600" />
              <span>{currentProfile}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            
            {isProfileMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-2 z-50">
                <button 
                  onClick={() => { setCurrentProfile("Oscar"); setIsProfileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${currentProfile === "Oscar" ? "font-bold text-black" : "text-gray-600"}`}
                >
                  Oscar
                </button>
                <button 
                  onClick={() => { setCurrentProfile("Eglee"); setIsProfileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${currentProfile === "Eglee" ? "font-bold text-black" : "text-gray-600"}`}
                >
                  Eglee
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="px-6 flex items-center justify-center space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab 
                  ? "border-black text-black" 
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Title Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Panel de Liquidaciones</h1>
            <p className="text-sm text-gray-500 mt-1">Gestiona las ganancias y balances de tu flota de conductores.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                if (window.confirm("¿Estás seguro de borrar los datos? Para tener de nuevo la cuenta deberá simular nuevamente.")) {
                  await fetch(`/api/clear?admin=${currentProfile}`, { method: 'POST' });
                  window.location.reload();
                }
              }}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg shadow hover:bg-red-700 transition"
            >
              Borrar Datos
            </button>
            <button 
              onClick={exportToExcel}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg shadow hover:bg-gray-800 transition"
            >
              Descargar Reporte
            </button>
          </div>
        </div>

        {/* Content based on Active Tab */}
        {activeTab === 'Liquidaciones' && (
          <>
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar conductor" 
                    className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-full text-sm font-medium focus:ring-2 focus:ring-black focus:bg-white transition-all w-64 outline-none"
                  />
                </div>
                <div className="flex items-center bg-gray-50 p-1 rounded-full">
                  <button 
                    onClick={() => setViewMode('week')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${viewMode === 'week' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    Por Semana
                  </button>
                  <button 
                    onClick={() => setViewMode('month')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${viewMode === 'month' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    Por Mes
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                <button 
                  onClick={handlePrevPeriod}
                  disabled={viewMode === 'custom'}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className="px-4 py-1.5 text-sm font-semibold hover:bg-gray-50 rounded-full transition-colors min-w-[140px]"
                  >
                    {getDateDisplayText()}
                  </button>
                  
                  {isCalendarOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
                      <div className="flex flex-col">
                        <DayPicker
                          mode="range"
                          selected={selectedRange}
                          onSelect={setSelectedRange}
                          locale={es}
                          numberOfMonths={1}
                          showWeekNumber
                          components={{
                            WeekNumber: (props: any) => {
                              const days = props.week.days;
                              
                              // En lugar de semana relativa al mes, usamos la semana ISO universal del año
                              const weekNumber = getISOWeek(days[0].date);

                              const handleWeekClick = () => {
                                if (!days || days.length === 0) return;
                                setSelectedRange({
                                  from: days[0].date,
                                  to: days[days.length - 1].date
                                });
                              };
                              return (
                                <th className="rdp-week_number border-0 font-normal">
                                  <button
                                    onClick={handleWeekClick}
                                    className="text-gray-500 font-semibold text-xs hover:bg-gray-100 hover:text-black w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                    title="Seleccionar semana completa"
                                  >
                                    S{weekNumber}
                                  </button>
                                </th>
                              );
                            }
                          }}
                          className="border-none"
                        />
                      </div>
                      
                      <div className="mt-4 border-t border-gray-100 pt-3">
                        <button 
                          onClick={applyCustomRange}
                          disabled={!selectedRange?.from}
                          className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:hover:bg-black"
                        >
                          Aplicar Rango
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleNextPeriod}
                  disabled={viewMode === 'custom'}
                  className="p-1.5 hover:bg-white rounded-full transition-colors text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="w-8 py-4"></th>
                    <th className="py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Conductor</th>
                    <th className="py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Ganancias<br/>en Efectivo</th>
                    <th className="py-4 font-bold text-blue-700 text-xs uppercase tracking-wider text-right">Ingreso Neto<br/>Admin (65%)</th>
                    <th className="py-4 font-bold text-emerald-700 text-xs uppercase tracking-wider text-right">Ingreso Neto<br/>Flota (35%)</th>
                    <th className="py-4 font-bold text-gray-900 text-xs uppercase tracking-wider text-right pr-6">Ganancias<br/>Totales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {driversData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        No hay datos sincronizados para esta fecha.
                      </td>
                    </tr>
                  ) : driversData.map((driver) => {
                    const isExpanded = expandedRows[driver.id];
                    const totals = calculateTotals(driver.platforms);
                    
                    return (
                      <React.Fragment key={driver.id}>
                        {/* General Sum Row */}
                        <tr 
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
                          onClick={() => toggleRow(driver.id)}
                        >
                          <td className="py-4 pl-2">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {driver.photoUrl ? (
                                <img src={`${driver.photoUrl}?t=${new Date().getTime()}`} alt={driver.name} className="w-10 h-10 rounded-full border border-gray-200 object-cover shadow-sm" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200 shadow-sm">
                                  <CircleUser className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900 uppercase leading-none">{driver.name}</span>
                                {(driver.admin || driver.dateRange) && (
                                  <span className="text-[10px] text-gray-500 mt-1 font-medium">
                                    {driver.admin ? `ADMIN: ${driver.admin}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-right text-orange-600 font-medium">€{totals.totalEfectivo.toFixed(2)}</td>
                          <td className="py-4 text-right font-bold text-blue-700 bg-blue-50/30">€{totals.ingresoNetoAdmin.toFixed(2)}</td>
                          <td className="py-4 text-right font-bold text-emerald-700 bg-emerald-50/30">€{totals.gananciaConductor.toFixed(2)}</td>
                          <td className="py-4 text-right text-gray-900 font-black text-lg pr-6">€{totals.totalBruto.toFixed(2)}</td>
                        </tr>

                        {/* Individual Breakdowns (Expanded) */}
                        {isExpanded && (
                          <tr className="bg-gray-50/50">
                            <td colSpan={7} className="p-0 border-b border-gray-200">
                              <div className="pl-14 pr-6 py-4 bg-white/50 shadow-inner">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Desglose de Plataformas</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  
                                  {Object.entries(driver.platforms).map(([platform, data]) => {
                                    if (data.invoiced === 0 && data.cash === 0) return null;
                                    
                                    const dotColor = platform === 'uber' ? 'bg-black' : platform === 'cabify' ? 'bg-purple-600' : platform === 'bolt' ? 'bg-green-500' : 'bg-gray-400';
                                    
                                    return (
                                      <div key={platform} className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></div>
                                          <span className="text-sm font-bold capitalize">{platform}</span>
                                        </div>
                                        <div className="space-y-2">
                                          <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Ganancias Totales:</span>
                                            <span className="font-bold">€{data.invoiced.toFixed(2)}</span>
                                          </div>
                                          {platform === 'cabify' && data.cobradoABordo !== null && data.cobradoABordo !== undefined ? (
                                            <div className="flex justify-between text-xs">
                                              <span className="text-gray-500">Cobrado a bordo:</span>
                                              <span className="font-bold text-orange-600">€{data.cobradoABordo.toFixed(2)}</span>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="flex justify-between text-xs">
                                                <span className="text-gray-500">Cobro Efectivo:</span>
                                                <span className="font-bold text-orange-600">€{data.cash.toFixed(2)}</span>
                                              </div>
                                              {platform === 'cabify' && (
                                                <div className="flex justify-between text-xs">
                                                  <span className="text-gray-500">Cobrado a bordo:</span>
                                                  <span className="font-bold text-orange-600">-</span>
                                                </div>
                                              )}
                                            </>
                                          )}
                                          <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-xs">
                                            <span className="font-bold text-blue-700">Admin (65%):</span>
                                            <span className="font-bold text-blue-700">€{(data.invoiced * 0.65).toFixed(2)}</span>
                                          </div>
                                          <div className="flex justify-between text-xs">
                                            <span className="font-bold text-emerald-700">Flota (35%):</span>
                                            <span className="font-bold text-emerald-700">€{(data.invoiced * 0.35).toFixed(2)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-900 text-white">
                  <tr>
                    <td className="py-5 pl-2 rounded-bl-xl"></td>
                    <td className="py-5 text-xs font-bold uppercase tracking-wider">Total Flota</td>
                    <td className="py-5 text-right text-orange-400 font-bold">
                      €{driversData.reduce((acc, driver) => acc + calculateTotals(driver.platforms).totalEfectivo, 0).toFixed(2)}
                    </td>
                    <td className="py-5 text-right font-bold text-blue-400 bg-white/5">
                      €{driversData.reduce((acc, driver) => acc + calculateTotals(driver.platforms).ingresoNetoAdmin, 0).toFixed(2)}
                    </td>
                    <td className="py-5 text-right font-bold text-emerald-400 bg-white/10">
                      €{driversData.reduce((acc, driver) => acc + calculateTotals(driver.platforms).gananciaConductor, 0).toFixed(2)}
                    </td>
                    <td className="py-5 text-right font-black text-white text-xl pr-6 rounded-br-xl">
                      €{driversData.reduce((acc, driver) => acc + calculateTotals(driver.platforms).totalBruto, 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {/* Master Registry View */}
        {activeTab === 'Socios conductores' && (
          <div className="w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Directorio de Conductores</h2>
              <span className="px-3 py-1 bg-black text-white text-xs font-bold rounded-full">{masterDrivers.length} Registrados</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {masterDrivers.map((driver) => (
                <div key={driver.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all flex items-start gap-4">
                  {driver.photoUrl ? (
                    <img src={`${driver.photoUrl}?t=${new Date().getTime()}`} alt={driver.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-sm" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200 shadow-sm">
                      <CircleUser className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <h3 className="font-bold text-gray-900 uppercase leading-tight">{driver.name}</h3>
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit">
                        ID: {driver.id}
                      </span>
                      {driver.admin && (
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded w-fit">
                          Admin: {driver.admin}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 mt-1">
                        Registrado: {new Date(driver.firstSeen).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
