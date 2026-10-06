import React, { useState, useEffect } from "react";
import { ShieldCheck, RefreshCw, KeyRound, AlertTriangle, Save, Smartphone, MapPin, Clock, Plus, Activity, Send, User, Trash2 } from "lucide-react";
import { apiFetch } from "../lib/api";

interface ProfileCenterProps {
  uid: string;
  onProfileUpdated?: () => void;
}

export default function ProfileCenter({ uid, onProfileUpdated }: ProfileCenterProps) {
  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(30);
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [medicalInfo, setMedicalInfo] = useState("");
  const [nomineePin, setNomineePin] = useState("");
  const [nomineePhone, setNomineePhone] = useState("");
  const [nomineeName, setNomineeName] = useState("");
  const [trustedContacts, setTrustedContacts] = useState<any[]>([]);
  const [lastNomineeActive, setLastNomineeActive] = useState<string | null>(null);

  // Safety Monitoring fields
  const [streakDuration, setStreakDuration] = useState<number>(7);
  const [gracePeriod, setGracePeriod] = useState<number>(24);
  const [emergencyNomineeName, setEmergencyNomineeName] = useState("");
  const [emergencyNomineeEmail, setEmergencyNomineeEmail] = useState("");
  const [lastActiveTimestamp, setLastActiveTimestamp] = useState<number | null>(null);
  const [currentStreakStatus, setCurrentStreakStatus] = useState("Safe");
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);

  // States for registering a new trusted contact
  const [newContactName, setNewContactName] = useState("");
  const [newContactRelation, setNewContactRelation] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [contactError, setContactError] = useState("");

  const [loading, setLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await apiFetch(`/api/profile/${uid}`);
      const data = await res.json();
      if (data) {
        setName(data.name || "");
        setAge(data.age || 30);
        setBloodGroup(data.bloodGroup || "O+");
        setEmergencyContactName(data.emergencyContactName || "");
        setEmergencyContactPhone(data.emergencyContactPhone || "");
        setMedicalInfo(data.medicalInfo || "");
        setNomineePin(data.nomineePin || "");
        setNomineePhone(data.nomineePhone || "");
        setNomineeName(data.nomineeName || "");
        setTrustedContacts(data.trustedContacts || []);
        setLastNomineeActive(data.lastNomineeActive || null);
        setStreakDuration(data.streakDuration || 7);
        setGracePeriod(data.gracePeriod || 24);
        setEmergencyNomineeName(data.emergencyNomineeName || "");
        setEmergencyNomineeEmail(data.emergencyNomineeEmail || "");
        setLastActiveTimestamp(data.lastActiveTimestamp ?? null);
        setCurrentStreakStatus(data.currentStreakStatus || "Safe");
      }
    } catch (e) {
      console.error("Failed to load profile", e);
    }
  };

  const fetchSessionsAndAlerts = async () => {
    try {
      const sRes = await apiFetch(`/api/security/sessions/${uid}`);
      const sData = await sRes.json();
      setSessions(Array.isArray(sData) ? sData : []);

      const aRes = await apiFetch(`/api/security/alerts/${uid}`);
      const aData = await aRes.json();
      setAlerts(Array.isArray(aData) ? aData : []);
    } catch (e) {
      console.error("Failed to load security assets", e);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchSessionsAndAlerts();
  }, [uid]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setSaveError(null);

    if (!emergencyNomineeName.trim()) {
      setSaveError("Emergency Nominee Name is mandatory!");
      return;
    }
    if (!emergencyNomineeEmail.trim()) {
      setSaveError("Emergency Nominee Email is mandatory!");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch(`/api/profile/${uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          age,
          bloodGroup,
          emergencyContactName,
          emergencyContactPhone,
          medicalInfo,
          nomineePin,
          nomineePhone,
          nomineeName,
          trustedContacts,
          streakDuration,
          gracePeriod,
          emergencyNomineeName,
          emergencyNomineeEmail
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        fetchSessionsAndAlerts();
        if (onProfileUpdated) onProfileUpdated();
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setTestEmailSending(true);
    setTestEmailResult(null);
    try {
      const res = await apiFetch(`/api/safety/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid })
      });
      const data = await res.json();
      if (res.ok) {
        setTestEmailResult(`Test email sent to ${data.to} (status: ${data.currentStatus}).`);
      } else {
        setTestEmailResult(`Failed: ${data.error || "unknown error"}`);
      }
    } catch (err: any) {
      setTestEmailResult(`Failed: ${err?.message || err}`);
    } finally {
      setTestEmailSending(false);
    }
  };

  const handleRevokeSession = async (sessId: string) => {
    try {
      const res = await apiFetch("/api/security/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, sessionId: sessId })
      });
      if (res.ok) {
        fetchSessionsAndAlerts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Form Panel */}
      <div className="lg:col-span-2 app-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[var(--border-card)] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]" id="profile-section-title">Emergency Core Profile</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Vital responder statistics synced to secure fallback channels</p>
            </div>
          </div>

          <div className="shrink-0">
            {lastNomineeActive ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-xs">Nominee Portal Active</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-app)] border border-[var(--border-card)] rounded-xl text-xs text-[var(--text-muted)]">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                <span className="font-semibold text-xs">Nominee Portal Inactive</span>
              </div>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-xs font-semibold animate-fade-in flex items-center gap-2" id="profile-save-success">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Your vital resilience metadata and Nominee configurations have been persisted and secured.</span>
          </div>
        )}

        {saveError && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-xs font-semibold animate-fade-in flex items-center gap-2" id="profile-save-error">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-8">
          {/* PERSONAL INFORMATION */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Personal Resilience Parameters</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field w-full text-xs"
                  placeholder="Alex Mercer"
                  id="profile-input-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Age</label>
                  <input
                    type="number"
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="input-field w-full text-xs"
                    placeholder="34"
                    id="profile-input-age"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="input-field w-full text-xs"
                    id="profile-select-blood"
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* MEDICAL INFRASTRUCTURE */}
          <div className="border-t border-[var(--border-card)] pt-6 space-y-2">
            <label className="block text-xs font-extrabold uppercase text-indigo-400 tracking-wider">Medical Alert Information</label>
            <textarea
              value={medicalInfo}
              onChange={(e) => setMedicalInfo(e.target.value)}
              rows={3}
              className="input-field w-full text-xs resize-none"
              placeholder="Allergies, chronic conditions, prescriptions, insurance numbers, active treatments..."
              id="profile-input-medical"
            />
          </div>

          {/* TRUSTED EMERGENCY CONTACTS (CRUD) */}
          <div className="border-t border-[var(--border-card)] pt-6 space-y-4">
            <div>
              <h3 className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>Trusted Emergency Contacts (Circle of Trust)</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                Build your circle of trusted medical responders, family members, or legal guardians. Give them permission to view specific documents or contact medical desks.
              </p>
            </div>

            {/* Contacts Table */}
            <div className="overflow-x-auto rounded-2xl border border-[var(--border-card)] bg-[var(--bg-app)]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Relation</th>
                    <th className="py-3 px-4">Phone / Email</th>
                    <th className="py-3 px-4 text-center">Nominee Access</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-card)]">
                  {trustedContacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-[var(--text-muted)]">
                        No additional trusted contacts registered. Add your first below!
                      </td>
                    </tr>
                  ) : (
                    trustedContacts.map((contact, index) => (
                      <tr key={contact.id || index} className="hover:bg-[var(--bg-card)]/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[var(--text-primary)]">{contact.name}</td>
                        <td className="py-3.5 px-4 text-indigo-400 font-medium">{contact.relation}</td>
                        <td className="py-3.5 px-4 text-[var(--text-muted)] font-mono">
                          <div>{contact.phone}</div>
                          {contact.email && <div className="text-[10px] opacity-75">{contact.email}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <label className="relative inline-flex items-center cursor-pointer justify-center">
                            <input
                              type="checkbox"
                              checked={!!contact.nomineeAccess}
                              onChange={() => {
                                const updated = [...trustedContacts];
                                updated[index] = { ...updated[index], nomineeAccess: !updated[index].nomineeAccess };
                                setTrustedContacts(updated);
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = trustedContacts.filter((_, i) => i !== index);
                              setTrustedContacts(updated);
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Register New Form Container */}
            <div className="bg-[var(--bg-app)] border border-[var(--border-card)] rounded-2xl p-5 space-y-4">
              <h4 className="text-[11px] font-black uppercase text-[var(--text-primary)] tracking-wider flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-indigo-400" />
                <span>Register New Trusted Contact</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-[var(--text-muted)] font-bold">Full Name</label>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="input-field w-full text-xs"
                    placeholder="e.g. Dr. Ramesh Gupta"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-[var(--text-muted)] font-bold">Relationship</label>
                  <input
                    type="text"
                    value={newContactRelation}
                    onChange={(e) => setNewContactRelation(e.target.value)}
                    className="input-field w-full text-xs"
                    placeholder="e.g. Family Physician"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-[var(--text-muted)] font-bold">Phone Number</label>
                  <input
                    type="tel"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="input-field w-full text-xs"
                    placeholder="+91 99000-00001"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-[var(--text-muted)] font-bold">Email Address</label>
                  <input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    className="input-field w-full text-xs"
                    placeholder="doctor@apollo.com"
                  />
                </div>
              </div>

              {contactError && (
                <div className="text-xs text-rose-400 font-medium px-1">
                  {contactError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!newContactName.trim()) {
                      setContactError("Please provide at least a name.");
                      return;
                    }
                    const newContact = {
                      id: "tc-" + Math.random().toString(36).substr(2, 9),
                      name: newContactName,
                      relation: newContactRelation,
                      phone: newContactPhone,
                      email: newContactEmail,
                      nomineeAccess: false
                    };
                    setTrustedContacts([...trustedContacts, newContact]);
                    setNewContactName("");
                    setNewContactRelation("");
                    setNewContactPhone("");
                    setNewContactEmail("");
                    setContactError("");
                  }}
                  className="btn-secondary py-2 px-4 text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Contact</span>
                </button>
              </div>
            </div>
          </div>

          {/* IMMEDIATE EMERGENCY RESPONDERS */}
          <div className="border-t border-[var(--border-card)] pt-6 space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span>Immediate Emergency Responders</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Primary Emergency Contact Name</label>
                <input
                  type="text"
                  required
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="input-field w-full text-xs"
                  placeholder="Sarah Mercer (Spouse)"
                  id="profile-input-contact-name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Primary Contact Phone Number</label>
                <input
                  type="tel"
                  required
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="input-field w-full text-xs"
                  placeholder="+1 (555) 019-2834"
                  id="profile-input-contact-phone"
                />
              </div>
            </div>
          </div>

          {/* PRIMARY NOMINEE CREDENTIALS */}
          <div className="border-t border-[var(--border-card)] pt-6 space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              <span>Primary Nominee Credentials</span>
            </h3>
            
            <div className="bg-[var(--bg-app)] border border-[var(--border-card)] rounded-2xl p-4 text-xs space-y-1.5">
              <p className="font-bold text-[var(--text-primary)]">Nominee Access Rule:</p>
              <p className="text-[var(--text-muted)] leading-relaxed">
                This individual is your primary legal nominee. They will have authorized permission to log in and access your continuity plan and essential records during crisis mode using their phone number and your Emergency PIN.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Nominee Full Name</label>
                <input
                  type="text"
                  required
                  value={nomineeName}
                  onChange={(e) => setNomineeName(e.target.value)}
                  className="input-field w-full text-xs"
                  placeholder="Nominee Legal Name"
                  id="profile-input-nominee-name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Nominee Registered Phone</label>
                <input
                  type="tel"
                  required
                  value={nomineePhone}
                  onChange={(e) => setNomineePhone(e.target.value)}
                  className="input-field w-full text-xs"
                  placeholder="+1 (555) 012-3456"
                  id="profile-input-nominee-phone"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Emergency Access PIN</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={nomineePin}
                  onChange={(e) => setNomineePin(e.target.value)}
                  className="input-field w-full text-xs font-mono tracking-widest text-center font-bold"
                  placeholder="4-digit PIN"
                  id="profile-input-nominee-pin"
                />
              </div>
            </div>

            <div className="text-xs bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 p-4 rounded-2xl space-y-1">
              <span className="font-bold uppercase tracking-wider block text-indigo-200">Sandbox Testing Guide:</span>
              <p className="leading-relaxed text-[var(--text-muted)]">
                Log out and access the <strong className="text-[var(--text-primary)]">Nominee Access</strong> tab with phone <span className="font-mono font-bold text-indigo-300">{nomineePhone || "+1 (555) 012-3456"}</span> and custom PIN <span className="font-mono font-bold text-indigo-300">{nomineePin || "1234"}</span>. You will receive a mock OTP <span className="font-bold text-white">7777</span> automatically!
              </p>
            </div>
          </div>

          {/* SAFETY MONITORING (Life Streak) */}
          <div className="border-t border-[var(--border-card)] pt-6 space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Safety Monitoring (Life Streak)</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              If you do not check in for the streak duration plus the grace period, we email you a check-in confirmation. If you do not confirm within 12 hours, your emergency nominee is notified. Never alarmed immediately — you are always asked first.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Emergency Nominee Name</label>
                <input
                  type="text"
                  value={emergencyNomineeName}
                  onChange={(e) => setEmergencyNomineeName(e.target.value)}
                  className="input-field w-full text-xs"
                  placeholder="Sarah Mercer"
                  id="profile-input-nominee-email-name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Emergency Nominee Email</label>
                <input
                  type="email"
                  value={emergencyNomineeEmail}
                  onChange={(e) => setEmergencyNomineeEmail(e.target.value)}
                  className="input-field w-full text-xs"
                  placeholder="nominee@example.com"
                  id="profile-input-nominee-email"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Streak Duration (days)</label>
                <input
                  type="number"
                  min={1}
                  value={streakDuration}
                  onChange={(e) => setStreakDuration(Number(e.target.value))}
                  className="input-field w-full text-xs"
                  placeholder="7"
                  id="profile-input-streak-duration"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Grace Period (hours)</label>
                <input
                  type="number"
                  min={0}
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(Number(e.target.value))}
                  className="input-field w-full text-xs"
                  placeholder="24"
                  id="profile-input-grace-period"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[var(--bg-app)] border border-[var(--border-card)] rounded-2xl p-4">
                <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Last Active</p>
                <p className="text-xs font-bold text-[var(--text-primary)] mt-1 font-mono">
                  {lastActiveTimestamp
                    ? new Date(lastActiveTimestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "No activity recorded yet"}
                </p>
              </div>
              <div className="bg-[var(--bg-app)] border border-[var(--border-card)] rounded-2xl p-4">
                <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Current Status</p>
                <p className={`text-xs font-bold mt-1 ${currentStreakStatus === "Safe" ? "text-emerald-400" : currentStreakStatus === "Awaiting Confirmation" ? "text-amber-400" : "text-rose-400"}`}>
                  {currentStreakStatus}
                </p>
              </div>
              <div className="bg-[var(--bg-app)] border border-[var(--border-card)] rounded-2xl p-4 flex flex-col justify-between">
                <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Test Sandbox</p>
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testEmailSending}
                  className="mt-1 btn-secondary py-1.5 px-3 text-[11px] font-bold self-start cursor-pointer"
                  id="btn-test-emergency-email"
                >
                  <Send className="h-3 w-3" />
                  <span>{testEmailSending ? "Sending..." : "Test Emergency Email"}</span>
                </button>
                {testEmailResult && <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">{testEmailResult}</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-3 px-8 text-xs font-bold"
              id="profile-btn-save"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? "Saving Records..." : "Save Emergency Profile"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security & Device Center Panel */}
      <div className="space-y-6">
        {/* MFA Center */}
        <div className="app-card p-6 space-y-4">
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <span>Multi-Factor Auth (MFA)</span>
          </h3>
          <div className="flex items-center justify-between bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)]">
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                mfaEnabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              }`}>
                {mfaEnabled ? "Secured — MFA enabled" : "Unsecured — MFA disabled"}
              </span>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Requiring passkey or SMS OTP confirmation</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={mfaEnabled}
                onChange={(e) => setMfaEnabled(e.target.checked)}
                className="sr-only peer"
                id="checkbox-mfa"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Device Sessions */}
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-3">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-indigo-400" />
              <span>Active Device Sessions</span>
            </h3>
            <button
              onClick={fetchSessionsAndAlerts}
              className="p-1.5 hover:bg-[var(--bg-app)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              id="btn-refresh-sessions"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {sessions.map((sess) => (
              <div key={sess.id} className="p-3.5 border border-[var(--border-card)] rounded-xl bg-[var(--bg-app)] flex justify-between items-start text-xs hover:border-indigo-500/30 transition-colors">
                <div className="space-y-1">
                  <p className="font-bold text-[var(--text-primary)]">{sess.device}</p>
                  <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> <span>{sess.location}</span>
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" /> <span>{new Date(sess.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeSession(sess.id)}
                  className="text-[10px] text-rose-400 font-bold hover:bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/30 shrink-0 transition-all cursor-pointer"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security Alerts */}
        <div className="app-card p-6 space-y-4 max-h-[300px] overflow-y-auto">
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 sticky top-0 bg-[var(--bg-card)] py-1 border-b border-[var(--border-card)]">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <span>Live Security Feed</span>
          </h3>
          <div className="space-y-3.5">
            {alerts.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">No recent security anomalies on record.</p>
            ) : (
              alerts.map((al) => (
                <div key={al.id} className="relative pl-3.5 border-l-2 border-amber-400 space-y-0.5 animate-fade-in">
                  <p className="text-xs font-bold text-[var(--text-primary)]">{al.event}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{al.details}</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono">
                    {new Date(al.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
