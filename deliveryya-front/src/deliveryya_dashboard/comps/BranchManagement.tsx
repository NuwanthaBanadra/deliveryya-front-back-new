import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BuildingOffice2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  EyeIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhoneIcon,
  PlusIcon,
  UserGroupIcon,
  UserMinusIcon,
  WalletIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';
import axiosInstance from '../../util/AxiosUtil';
import { assignUserToBranch, getBranchEmployees, getBranchWalletBalance, getBranchWalletHistory, getBranches, removeEmployeeFromBranch, saveBranch } from '../../util/BranchApi';
import type { Branch, BranchEmployee } from '../../types/BranchTypes';
import type { CommonIdName } from '../../types/EntitiesTypes';
import type { PaginatedWalletHistoryDto } from '../../types/WalletTypes';
import { UserSearch } from '../../advance_panel/comps/career/UserSearch';
import { SignUpForm } from '../../advance_panel/comps/career/SignUpForm';
import { EmployeeRegistrationForm } from '../../advance_panel/comps/career/EmployeeRegistrationForm';

type City = CommonIdName;

const emptyBranch = { name: '', mainLine: '', location: '', city: { id: 0, name: '' } };

interface BranchManagementProps {
  mode?: 'list' | 'overview' | 'wallet' | 'employees';
}

export default function BranchManagement({ mode = 'list' }: BranchManagementProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { branchId } = useParams();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [employees, setEmployees] = useState<BranchEmployee[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletHistory, setWalletHistory] = useState<Awaited<ReturnType<typeof getBranchWalletHistory>>['items']>([]);
  const [walletQuery, setWalletQuery] = useState<PaginatedWalletHistoryDto>({
    pageNumber: 0,
    countPerPage: 10,
    totalCount: 0,
    totalPages: 0,
    fromDate: null,
    toDate: null,
    minAmount: null,
    maxAmount: null,
    search: '',
    items: [],
  });
  const [form, setForm] = useState<typeof emptyBranch>(emptyBranch);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [showEmployeePanel, setShowEmployeePanel] = useState(false);
  const [employeeMode, setEmployeeMode] = useState<'existing' | 'new'>('existing');
  const [selectedUser, setSelectedUser] = useState<{ id: number; firstName: string; lastName: string; email: string; nic: string } | null>(null);
  const [newUser, setNewUser] = useState<{ userId: number; firstName: string; lastName: string } | null>(null);

  const loadBranches = useCallback(async () => {
    try {
      const result = await getBranches({});
      setBranches(result?.items ?? []);
    } catch (error) {
      console.error('Failed to load branches', error);
      Swal.fire('Error', 'Unable to load branches.', 'error');
    }
  }, []);

  useEffect(() => {
    loadBranches();
    axiosInstance.post('/users/get-cities', { pageNumber: 0, countPerPage: 500 })
      .then((response) => setCities(response.data?.object?.items ?? []))
      .catch((error) => console.error('Failed to load cities', error));
  }, [loadBranches]);

  useEffect(() => {
    if (mode === 'list' || !branchId || branches.length === 0) return;
    const branch = branches.find((item) => item.id === Number(branchId));
    if (branch) void openBranch(branch);
  }, [branchId, branches, mode]);

  const openBranch = async (branch: Branch) => {
    setSelectedBranch(branch);
    setShowEmployeePanel(false);
    try {
      const [branchEmployees, balance, history] = await Promise.all([
        getBranchEmployees(branch.id),
        getBranchWalletBalance(branch.id),
        getBranchWalletHistory(branch.id, walletQuery),
      ]);
      setEmployees(branchEmployees);
      setWalletBalance(balance);
      setWalletHistory(history.items ?? []);
      setWalletQuery((current) => ({
        ...current,
        totalCount: history.totalCount ?? 0,
        totalPages: history.totalPages ?? 0,
      }));
    } catch (error) {
      console.error('Failed to load branch details', error);
      Swal.fire('Error', 'Unable to load branch details.', 'error');
    }
  };

  const changeWalletPage = async (pageNumber: number) => {
    if (!selectedBranch || pageNumber < 0 || pageNumber >= walletQuery.totalPages) return;
    const request = { ...walletQuery, pageNumber };
    const response = await getBranchWalletHistory(selectedBranch.id, request);
    setWalletQuery({ ...request, ...response });
    setWalletHistory(response.items ?? []);
  };

  const submitBranch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.mainLine.trim() || !form.location.trim() || !form.city.id) {
      Swal.fire('Incomplete form', 'Name, main line, location, and city are required.', 'warning');
      return;
    }
    try {
      await saveBranch({ ...form, id: editingId });
      await loadBranches();
      setShowForm(false);
      setEditingId(undefined);
      setForm(emptyBranch);
      Swal.fire('Saved', editingId ? 'Branch updated.' : 'Branch created with a wallet.', 'success');
    } catch (error) {
      console.error('Failed to save branch', error);
      Swal.fire('Error', 'Unable to save branch.', 'error');
    }
  };

  const assignExisting = async () => {
    if (!selectedBranch || !selectedUser) return;
    try {
      await assignUserToBranch(selectedBranch.id, selectedUser.id);
      await openBranch(selectedBranch);
      setSelectedUser(null);
      setShowEmployeePanel(false);
      Swal.fire('Assigned', 'Employee assigned to this branch.', 'success');
    } catch (error) {
      console.error('Failed to assign employee', error);
      Swal.fire('Error', 'Only registered employees can be assigned.', 'error');
    }
  };

  const handleRegistrationSuccess = async () => {
    if (!selectedBranch || !newUser) return;
    await assignUserToBranch(selectedBranch.id, newUser.userId);
    await openBranch(selectedBranch);
    setNewUser(null);
    setShowEmployeePanel(false);
    Swal.fire('Assigned', 'New employee registered and assigned.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="relative flex items-center justify-between gap-4 bg-linear-to-r from-orange-50 via-white to-amber-50 px-6 py-6 sm:px-8">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#AC6C2A]">
              <BuildingOffice2Icon className="h-4 w-4" />
              Company operations
            </div>
            <h1 className="text-2xl font-black text-slate-900">{mode === 'list' ? 'Manage branches' : selectedBranch?.name ?? 'Branch workspace'}</h1>
            <p className="mt-1 text-sm text-slate-500">{mode === 'list' ? 'Create, update and monitor your company branches.' : 'Branch wallet, team and operational details.'}</p>
          </div>
          {mode === 'list' ? (
            <button onClick={() => { setEditingId(undefined); setForm(emptyBranch); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[#AC6C2A] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#8f5724]">
              <PlusIcon className="h-5 w-5" /> New branch
            </button>
          ) : (
            <button onClick={() => navigate('/deliverYya-cloud-console/branches')} className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-bold text-[#AC6C2A] transition hover:bg-orange-50">
              <ArrowLeftIcon className="h-4 w-4" /> Back to branches
            </button>
          )}
          </div>
        </div>

      {mode === 'list' && (
        <Transition show={showForm} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setShowForm(false)}>
            <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm" />
            </TransitionChild>
            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-4 scale-[0.98]" enterTo="opacity-100 translate-y-0 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-4 scale-[0.98]">
                  <DialogPanel className="w-full max-w-2xl overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-2xl">
                    <div className="flex items-start justify-between border-b border-orange-100 bg-orange-50/60 px-6 py-5">
                      <div><DialogTitle className="text-xl font-black text-slate-900">{editingId ? 'Update branch' : 'Create branch'}</DialogTitle><p className="mt-1 text-sm text-slate-500">{editingId ? 'Update the branch contact and location details.' : 'A wallet will be initialized automatically for this branch.'}</p></div>
                      <button type="button" onClick={() => setShowForm(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Close branch form"><XMarkIcon className="h-5 w-5" /></button>
                    </div>
                    <form onSubmit={submitBranch} className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {(['name', 'mainLine', 'location'] as const).map((field) => (
              <label key={field} className="text-sm font-medium text-gray-700">
                {field === 'mainLine' ? 'Main line' : field[0].toUpperCase() + field.slice(1)}
                <input value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
            ))}
            <label className="text-sm font-medium text-gray-700">City
              <select value={form.city.id} onChange={(event) => { const city = cities.find((item) => item.id === Number(event.target.value)); setForm({ ...form, city: city ?? emptyBranch.city }); }} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                <option value={0}>Select city</option>
                {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button><button className="rounded-xl bg-[#AC6C2A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#8f5724]">{editingId ? 'Save changes' : 'Create branch'}</button></div>
                    </form>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </Dialog>
        </Transition>
      )}

      {mode === 'list' && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((branch) => (
          <div key={branch.id} className="rounded-xl bg-white p-5 shadow">
            <div className="flex items-start justify-between"><div><BuildingOffice2Icon className="h-8 w-8 text-amber-600" /><h2 className="mt-2 text-lg font-semibold">{branch.name}</h2><p className="text-sm text-gray-500">{branch.location} · {branch.city?.name}</p><p className="text-sm text-gray-500">{branch.mainLine}</p></div><button onClick={() => { setEditingId(branch.id); setForm({ name: branch.name, mainLine: branch.mainLine, location: branch.location, city: branch.city }); setShowForm(true); }}><PencilSquareIcon className="h-5 w-5 text-gray-500" /></button></div>
            <button onClick={() => navigate(`/deliverYya-cloud-console/branches/${branch.id}`)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"><EyeIcon className="h-4 w-4" /> Open branch</button>
          </div>
        ))}
      </div>}

      {mode !== 'list' && selectedBranch && (
        <section className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-[#AC6C2A]"><BuildingOffice2Icon className="h-8 w-8" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold text-gray-900">{selectedBranch.name}</h2><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Active</span></div>
                  <p className="mt-1 text-sm text-gray-500">Branch ID #{selectedBranch.id} · Operating branch</p>
                  <div className="mt-5 grid gap-3 text-sm text-gray-600 sm:grid-cols-2"><span className="flex items-center gap-2"><MapPinIcon className="h-5 w-5 text-amber-600" />{selectedBranch.location}, {selectedBranch.city?.name}</span><span className="flex items-center gap-2"><PhoneIcon className="h-5 w-5 text-amber-600" />{selectedBranch.mainLine}</span></div>
                </div>
              </div>
              <nav className="mt-6 flex flex-wrap gap-2 rounded-xl bg-orange-50 p-1.5">
                {([['Wallet', `/deliverYya-cloud-console/branches/${selectedBranch.id}/wallet`], ['Employees', `/deliverYya-cloud-console/branches/${selectedBranch.id}/employees`]] as const).map(([label, href]) => <button key={label} onClick={() => navigate(href)} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${location.pathname === href ? 'bg-white text-[#AC6C2A] shadow-sm' : 'text-gray-600 hover:bg-white/70'}`}>{label}</button>)}
              </nav>
            </div>
            <div className="rounded-2xl bg-[#24170d] p-6 text-white shadow-sm">
              <p className="text-sm font-semibold text-orange-200">Quick action</p>
              <h3 className="mt-2 text-xl font-bold">Grow your branch team</h3>
              <p className="mt-2 text-sm leading-6 text-white/70">Assign an existing employee or register a new team member for this location.</p>
              <button onClick={() => setShowEmployeePanel(!showEmployeePanel)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F59B0F] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#ffad2e]"><UserGroupIcon className="h-5 w-5" /> Add employee <ArrowUpRightIcon className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-500">Available wallet</span><WalletIcon className="h-6 w-6 text-amber-600" /></div><p className="mt-4 text-3xl font-bold text-gray-900">{walletBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '—'}</p><button onClick={() => navigate(`/deliverYya-cloud-console/branches/${selectedBranch.id}/wallet`)} className="mt-3 text-sm font-bold text-[#AC6C2A]">View wallet records →</button></div>
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-500">Team members</span><UserGroupIcon className="h-6 w-6 text-blue-600" /></div><p className="mt-4 text-3xl font-bold text-gray-900">{employees.length}</p><button onClick={() => navigate(`/deliverYya-cloud-console/branches/${selectedBranch.id}/employees`)} className="mt-3 text-sm font-bold text-blue-700">Manage employees →</button></div>
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-500">Wallet activity</span><ClockIcon className="h-6 w-6 text-violet-600" /></div><p className="mt-4 text-3xl font-bold text-gray-900">{walletHistory.length}</p><p className="mt-3 text-sm text-gray-500">Recorded transactions</p></div>
          </div>
          {mode !== 'wallet' && (
            <Transition show={showEmployeePanel} as={Fragment}>
              <Dialog as="div" className="relative z-50" onClose={() => setShowEmployeePanel(false)}>
                <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                  <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm" />
                </TransitionChild>
                <div className="fixed inset-0 overflow-y-auto">
                  <div className="flex min-h-full items-center justify-center p-4">
                    <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-4 scale-[0.98]" enterTo="opacity-100 translate-y-0 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-4 scale-[0.98]">
                      <DialogPanel className="w-full max-w-2xl overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-2xl">
                        <div className="flex items-start justify-between border-b border-orange-100 bg-orange-50/60 px-6 py-5">
                          <div><DialogTitle className="text-xl font-black text-slate-900">Add employee to branch</DialogTitle><p className="mt-1 text-sm text-slate-500">Assign an existing employee or register a new one for {selectedBranch.name}.</p></div>
                          <button type="button" onClick={() => setShowEmployeePanel(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Close employee modal"><XMarkIcon className="h-5 w-5" /></button>
                        </div>
                        <div className="max-h-[75vh] overflow-y-auto p-6">
                          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-orange-50 p-1.5">
                            <button type="button" onClick={() => { setEmployeeMode('existing'); setNewUser(null); }} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${employeeMode === 'existing' ? 'bg-white text-[#AC6C2A] shadow-sm' : 'text-slate-500 hover:bg-white/60'}`}>Existing employee</button>
                            <button type="button" onClick={() => { setEmployeeMode('new'); setSelectedUser(null); }} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${employeeMode === 'new' ? 'bg-white text-[#AC6C2A] shadow-sm' : 'text-slate-500 hover:bg-white/60'}`}>New employee</button>
                          </div>
                          {employeeMode === 'existing' && <div className="space-y-4"><UserSearch onUserSelected={setSelectedUser} onClearSelection={() => setSelectedUser(null)} selectedUser={selectedUser} title="Find employee account" description="Search for a registered employee who can be assigned to this branch." /><div className="flex justify-end"><button disabled={!selectedUser} onClick={assignExisting} className="rounded-xl bg-[#AC6C2A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#8f5724] disabled:cursor-not-allowed disabled:opacity-50">Assign employee</button></div></div>}
                          {employeeMode === 'new' && !newUser && <SignUpForm onSignUpSuccess={(userId, firstName, lastName) => setNewUser({ userId, firstName, lastName })} isLoading={false} />}
                          {employeeMode === 'new' && newUser && <EmployeeRegistrationForm userId={newUser.userId} firstName={newUser.firstName} lastName={newUser.lastName} branchId={selectedBranch.id} branchName={selectedBranch.name} onSuccess={handleRegistrationSuccess} isLoading={false} />}
                        </div>
                      </DialogPanel>
                    </TransitionChild>
                  </div>
                </div>
              </Dialog>
            </Transition>
          )}
          {mode === 'employees' && <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
              <div><h3 className="text-lg font-semibold text-gray-900">Branch employees</h3><p className="mt-1 text-sm text-gray-500">Employees currently assigned to {selectedBranch.name}.</p></div>
              <button type="button" onClick={() => setShowEmployeePanel(true)} className="inline-flex items-center gap-2 rounded-md bg-[#AC6C2A] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#8f5724]"><PlusIcon className="h-4 w-4" /> Add employee</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Employee</th><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Mobile</th><th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Action</th></tr></thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {employees.length === 0 ? <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">No employees assigned to this branch.</td></tr> : employees.map((employee) => <tr key={employee.id} className="hover:bg-orange-50/40"><td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{employee.usersFirstName} {employee.usersLastName}</td><td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{employee.usersEmail || '—'}</td><td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{employee.mobile || employee.whatsapp || '—'}</td><td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium"><button type="button" onClick={async () => { await removeEmployeeFromBranch(selectedBranch.id, employee.id); await openBranch(selectedBranch); }} className="inline-flex items-center gap-1 text-red-600 hover:text-red-800"><UserMinusIcon className="h-4 w-4" /> Remove</button></td></tr>)}
                </tbody>
              </table>
            </div>
          </div>}
          {mode !== 'employees' && <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
              <div><h3 className="font-semibold text-gray-900">Wallet records</h3><p className="mt-1 text-sm text-gray-500">A complete, paginated history for this branch wallet.</p></div>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#AC6C2A]">{walletQuery.totalCount} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Resulting Balance</th></tr></thead>
                <tbody className="divide-y divide-gray-100 bg-white">{walletHistory.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">No wallet records found.</td></tr> : walletHistory.map((record) => <tr key={record.id} className="hover:bg-orange-50/40"><td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">{record.createdAt ? new Date(record.createdAt).toLocaleString() : 'N/A'}</td><td className="px-5 py-4 text-sm font-medium text-gray-900">{record.note ?? record.otherReason ?? 'Wallet operation'}</td><td className="px-5 py-4 text-sm text-gray-600">{record.ref ?? record.code ?? 'N/A'}</td><td className={`whitespace-nowrap px-5 py-4 text-right text-sm font-semibold ${record.isExpense ? 'text-red-600' : 'text-emerald-600'}`}>{record.amount == null ? 'N/A' : `${record.isExpense ? '-' : '+'}${record.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</td><td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-gray-900">{record.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>)}</tbody>
              </table>
            </div>
            {walletQuery.totalCount > 0 && <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4"><p className="text-sm text-gray-600">Showing {walletQuery.pageNumber * walletQuery.countPerPage + 1} to {Math.min((walletQuery.pageNumber + 1) * walletQuery.countPerPage, walletQuery.totalCount)} of {walletQuery.totalCount}</p><div className="flex gap-2"><button onClick={() => void changeWalletPage(walletQuery.pageNumber - 1)} disabled={walletQuery.pageNumber === 0} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeftIcon className="h-4 w-4" /> Previous</button><button onClick={() => void changeWalletPage(walletQuery.pageNumber + 1)} disabled={walletQuery.pageNumber >= walletQuery.totalPages - 1} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Next <ChevronRightIcon className="h-4 w-4" /></button></div></div>}
          </div>}
        </section>
      )}
    </div>
  );
}
