import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import { usePlateSearch } from '../hooks/usePlateSearch';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import StatusDot from '../components/ui/StatusDot';
import FourFrameStrip from '../components/plates/FourFrameStrip';
import VehicleTimeline from '../components/plates/VehicleTimeline';
import { formatISTTime } from '../lib/utils';
import { Search, ShieldAlert } from 'lucide-react';

export default function PlateSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const { result, loading, error, search } = usePlateSearch();

  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('plate_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = (plate) => {
    if (!plate) return;
    const upperPlate = plate.toUpperCase();
    setSearchHistory(prev => {
      const filtered = prev.filter(p => p !== upperPlate);
      const newHistory = [upperPlate, ...filtered].slice(0, 10);
      localStorage.setItem('plate_search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  // Read plate from URL query param if present
  useEffect(() => {
    const initialPlate = searchParams.get('plate');
    if (initialPlate) {
      setQuery(initialPlate);
      search(initialPlate);
      addToHistory(initialPlate);
    }
  }, [searchParams]);

  const handleLookup = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearchParams({ plate: q });
    search(q);
    addToHistory(q);
  };

  return (
    <PageWrapper
      title="Plate Search & RTO Lookup"
      subtitle="Query license plate database for RTO ownership records and camera sightings"
      fullWidth
    >
      <div className="w-full space-y-6">
        {/* Search Bar */}
        <div className="bg-[#161616] border border-[#2A2A2A] rounded-[8px] p-6 shadow-md">
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  mono
                  value={query}
                  onChange={(e) => setQuery(e.target.value.toUpperCase())}
                  placeholder="Enter plate number — e.g. PB10AB1234"
                  className="text-[16px] uppercase tracking-wider h-12 px-4 bg-[#111111] border-[#333333]"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !query.trim()}
                className="px-8 h-12 text-[14px] font-semibold"
              >
                {loading ? 'Searching...' : 'Look up'}
              </Button>
            </div>
            
            <div className="flex flex-col items-center justify-center gap-3 border-t border-[#2A2A2A]/60 pt-4 mt-2">
              <p className="text-[12px] text-[#666666] font-ui text-center">
                Search is case-insensitive. Partial matches not supported.
              </p>
              
              {searchHistory.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span className="text-[12px] text-[#888888] font-medium mr-1 uppercase tracking-wider">Recent:</span>
                  {searchHistory.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQuery(item);
                        setSearchParams({ plate: item });
                        search(item);
                        addToHistory(item);
                      }}
                      className="px-3 py-1 bg-[#202020] hover:bg-[#2A2A2A] border border-[#333333] hover:border-[#4A4A4A] rounded-full text-[12px] text-[#D4D4D4] hover:text-[#FFFFFF] font-mono transition-all flex items-center gap-1.5 shadow-sm group"
                    >
                      <span className="tracking-wide">{item}</span>
                      <Search size={11} className="text-[#666666] group-hover:text-[#3B82F6] transition-colors" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchHistory([]);
                      localStorage.removeItem('plate_search_history');
                    }}
                    className="text-[11px] text-[#EF4444] hover:text-[#FF6666] ml-2 font-medium transition-colors underline-offset-2 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Search Results */}
        {result && (
          <div className="mt-8 space-y-8 animate-in fade-in duration-200">
            {/* Proper No Results State */}
            {!result.rto && result.events.length === 0 ? (
              <div className="bg-[#161616] border border-[#2A2A2A] rounded-[8px] overflow-hidden py-20 px-8 my-8 flex flex-col items-center justify-center text-center shadow-lg">
                <div className="w-16 h-16 rounded-full bg-[#222222] border border-[#333333] flex items-center justify-center mb-5 shadow-inner">
                  <Search size={28} className="text-[#777777]" />
                </div>
                <h3 className="text-[#FFFFFF] text-[18px] font-semibold font-ui tracking-wide">No Results Found</h3>
                <p className="text-[#999999] text-[14px] font-ui mt-2.5 max-w-md leading-relaxed">
                  We could not find any RTO records or camera sightings for <span className="text-[#FFFFFF] bg-[#222222] px-2 py-0.5 rounded font-mono font-semibold border border-[#333333]">"{result.plate_number}"</span>.
                </p>
              </div>
            ) : (
              <>
                {/* Panel 1: RTO Registration Record */}
                <div className="bg-[#161616] border border-[#2A2A2A] rounded-[6px] overflow-hidden">
                  {/* Blacklist Warning Banner */}
                  {result.blacklist_entry && (
                    <div className="bg-[#2A1010] border-b border-[#EF4444]/40 p-3.5 flex items-start gap-2.5">
                      <ShieldAlert size={18} strokeWidth={1.5} className="text-[#EF4444] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[13px] font-semibold text-[#EF4444] font-ui">
                          Restricted Vehicle Alert
                        </div>
                        <div className="text-[12px] text-[#F0F0F0] mt-0.5 font-ui">
                          {result.blacklist_entry.reason}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RTO Content */}
                  <div className="p-5">
                    <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
                      <div>
                        <span className="text-[20px] font-bold font-data text-[#F0F0F0] tracking-wide">
                          {result.plate_number}
                        </span>
                        <span className="text-[12px] text-[#888888] ml-3 font-ui">
                          Registered Owner
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#888888]">
                        <StatusDot
                          status={result.rto?.status === 'active' ? 'active' : 'fault'}
                          size="sm"
                        />
                        <span className="capitalize">{result.rto?.status || 'Unknown'}</span>
                      </div>
                    </div>

                    {result.rto ? (
                      <div className="mt-4 space-y-3">
                        <div className="text-[16px] font-semibold text-[#F0F0F0] font-ui">
                          {result.rto.owner_name}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4 pt-2 text-[13px] font-ui">
                          <div className="flex justify-between py-1 border-b border-[#2A2A2A]/40">
                            <span className="text-[#888888]">Vehicle Make</span>
                            <span className="text-[#F0F0F0] font-medium">
                              {result.rto.vehicle_make} {result.rto.vehicle_model}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-[#2A2A2A]/40">
                            <span className="text-[#888888]">Color / State</span>
                            <span className="text-[#F0F0F0]">
                              {result.rto.vehicle_color}, {result.rto.registration_state}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-[#2A2A2A]/40">
                            <span className="text-[#888888]">Registration Year</span>
                            <span className="text-[#F0F0F0] font-data">
                              {result.rto.registration_year}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-[#2A2A2A]/40">
                            <span className="text-[#888888]">Chassis No.</span>
                            <span className="text-[#F0F0F0] font-data text-[12px]">
                              {result.rto.chassis_number || '—'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-[#2A2A2A]/40 sm:col-span-2">
                            <span className="text-[#888888]">Insurance Validity</span>
                            <span
                              className={`font-data ${
                                result.rto.status === 'expired'
                                  ? 'text-[#EF4444]'
                                  : 'text-[#22C55E]'
                              }`}
                            >
                              {result.rto.insurance_valid_until
                                ? `Valid until ${result.rto.insurance_valid_until}`
                                : 'Valid'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-[13px] text-[#888888] font-ui">
                        No registration record found for this plate.
                      </div>
                    )}
                  </div>
                </div>

                {/* Panel 2: Sighting Frame Strip */}
                {result.events.length > 0 && (
                  <FourFrameStrip 
                    plate={result.plate_number} 
                    confidence={result.events[0]?.confidence ? result.events[0].confidence * 100 : 96.4} 
                    speed={54} 
                  />
                )}

                {/* Panel 3: Sighting Timeline */}
                {result.events.length > 0 ? (
                  <VehicleTimeline events={result.events} />
                ) : (
                  <div className="bg-[#161616] border border-[#2A2A2A] rounded-[6px] overflow-hidden p-5">
                    <div className="py-8 text-center text-[#888888] text-[13px] font-ui border border-dashed border-[#2A2A2A] rounded-[4px]">
                      No sightings in the current dataset. The vehicle may not have been captured during the demo window.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
