import React, { useState, useEffect } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell, TableSkeletonRows } from '../components/ui/Table';
import PlateTag from '../components/plates/PlateTag';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import api from '../lib/api';
import { formatISTTime } from '../lib/utils';
import { ShieldAlert, Plus, Trash2, AlertTriangle, User, CarFront, Loader2 } from 'lucide-react';

export default function RestrictedVehicles() {
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newCategory, setNewCategory] = useState('Stolen');
  const [newReason, setNewReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Remove confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetItem, setTargetItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBlacklist = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/blacklist');
      setBlacklist(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load restricted vehicles:', err);
      setError('Failed to load restricted vehicles from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const cleanPlate = newPlate.trim().toUpperCase().replace(/\s+/g, '');
    const cleanReason = newReason.trim();

    if (!cleanPlate || !cleanReason) {
      setModalError('Please enter both a plate number and a reason.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');

      const formattedReason = `[${newCategory}] ${cleanReason}`;
      const res = await api.post('/api/blacklist', {
        plate_number: cleanPlate,
        reason: formattedReason,
      });

      if (res.data) {
        setBlacklist(prev => [res.data, ...prev]);
      }

      setAddModalOpen(false);
      setNewPlate('');
      setNewReason('');
      setNewCategory('Stolen');
    } catch (err) {
      console.error('Failed to add vehicle:', err);
      const msg = err.response?.data?.detail || 'Failed to add restricted vehicle. It may already exist.';
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!targetItem) return;
    try {
      setDeleting(true);
      await api.delete(`/api/blacklist/${targetItem.id}`);
      setBlacklist(prev => prev.filter(item => item.id !== targetItem.id));
      setDeleteModalOpen(false);
      setTargetItem(null);
    } catch (err) {
      console.error('Failed to remove vehicle:', err);
      alert(err.response?.data?.detail || 'Failed to remove vehicle from restricted list');
    } finally {
      setDeleting(false);
    }
  };

  const extractCategory = (item) => {
    if (item.category) return item.category;
    const reason = item.reason || '';
    if (reason.startsWith('[') && reason.includes(']')) {
      return reason.slice(1, reason.indexOf(']'));
    }
    const lower = reason.toLowerCase();
    if (lower.includes('stolen')) return 'Stolen';
    if (lower.includes('warrant') || lower.includes('wanted')) return 'Wanted';
    if (lower.includes('vip') || lower.includes('escort')) return 'VIP';
    if (lower.includes('hit and run') || lower.includes('suspicious') || lower.includes('probe')) return 'Suspicious';
    return 'Restricted';
  };

  const cleanDisplayReason = (reason) => {
    if (!reason) return '';
    if (reason.startsWith('[') && reason.includes(']')) {
      return reason.slice(reason.indexOf(']') + 1).trim();
    }
    return reason;
  };

  const getCategoryStyle = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'stolen': return 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30';
      case 'wanted': return 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30';
      case 'vip': return 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30';
      case 'suspicious': return 'bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/30';
      default: return 'bg-[#888888]/10 text-[#888888] border-[#888888]/30';
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'stolen': return <CarFront size={11} />;
      case 'wanted': return <ShieldAlert size={11} />;
      case 'vip': return <User size={11} />;
      default: return <ShieldAlert size={11} />;
    }
  };

  return (
    <PageWrapper
      title="Restricted Vehicles (Blacklist)"
      subtitle="Vehicles flagged for impoundment, criminal warrants, FIR investigations, or theft"
      fullWidth
      actions={
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setModalError('');
            setAddModalOpen(true);
          }}
          className="h-8"
        >
          <Plus size={14} strokeWidth={1.5} className="mr-1" />
          Add vehicle
        </Button>
      }
    >
      <div className="border border-[#2A2A2A] rounded-[6px] overflow-hidden bg-[#161616]">
        <Table>
          <TableHead>
            <tr>
              <TableHeader>Plate Number</TableHeader>
              <TableHeader>Category</TableHeader>
              <TableHeader>Flag Reason / Case Reference</TableHeader>
              <TableHeader>Added By</TableHeader>
              <TableHeader mono>Date Added (IST)</TableHeader>
              <TableHeader className="text-right">Action</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={6} rows={6} />
            ) : blacklist.length > 0 ? (
              blacklist.map((item) => {
                const cat = extractCategory(item);
                const displayReason = cleanDisplayReason(item.reason);

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <PlateTag plate={item.plate_number} />
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-[11px] font-bold uppercase tracking-wider ${getCategoryStyle(cat)}`}>
                        {getCategoryIcon(cat)}
                        {cat}
                      </div>
                    </TableCell>
                    <TableCell className="text-[#F0F0F0] max-w-md">
                      {displayReason}
                    </TableCell>
                    <TableCell className="text-[#888888]">
                      {item.added_by_name || 'Admin'}
                    </TableCell>
                    <TableCell mono className="text-[#888888] text-[12px]">
                      {formatISTTime(item.added_at, true)}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => {
                          setTargetItem(item);
                          setDeleteModalOpen(true);
                        }}
                        className="text-[12px] font-medium text-[#EF4444] hover:underline font-ui inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={13} strokeWidth={1.5} />
                        Remove
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-8">
                  <EmptyState
                    icon={ShieldAlert}
                    title="No restricted vehicles"
                    description="The restricted vehicle blacklist is currently clear."
                  />
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Vehicle Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => !submitting && setAddModalOpen(false)}
        title="Add Vehicle to Restricted List"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {modalError && (
            <div className="p-2.5 rounded bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-[12px] font-medium font-ui">
              {modalError}
            </div>
          )}

          <Input
            mono
            label="Plate Number"
            placeholder="e.g. CH01AB9999"
            value={newPlate}
            onChange={(e) => {
              setNewPlate(e.target.value.toUpperCase());
              if (modalError) setModalError('');
            }}
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-[#888888] font-ui">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-3 py-2 text-[14px] text-[#F0F0F0] focus:outline-none focus:border-[#3E7BFA] font-ui"
            >
              <option value="Stolen">Stolen</option>
              <option value="Wanted">Wanted</option>
              <option value="VIP">VIP</option>
              <option value="Suspicious">Suspicious</option>
            </select>
          </div>

          <Input
            label="Reason / Case Reference"
            placeholder="e.g. FIR No. 0411/2025, PS Sector 34"
            value={newReason}
            onChange={(e) => {
              setNewReason(e.target.value);
              if (modalError) setModalError('');
            }}
            required
          />

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="md"
              type="button"
              disabled={submitting}
              onClick={() => setAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={submitting || !newPlate.trim() || !newReason.trim()}
              className="flex items-center gap-1.5 font-semibold"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              <span>{submitting ? 'Adding...' : 'Add to List'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        title="Confirm Removal"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} strokeWidth={1.5} className="text-[#EF4444] shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#F0F0F0] leading-relaxed">
              Remove vehicle{' '}
              <span className="font-data font-semibold text-[#3E7BFA]">
                {targetItem?.plate_number}
              </span>{' '}
              from the restricted surveillance list?
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="md"
              type="button"
              disabled={deleting}
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              type="button"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="flex items-center gap-1.5"
            >
              {deleting && <Loader2 size={13} className="animate-spin" />}
              <span>{deleting ? 'Removing...' : 'Confirm Remove'}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
