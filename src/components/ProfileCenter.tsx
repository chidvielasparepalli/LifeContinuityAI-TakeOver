import React, { useState, useEffect } from "react";
import { ShieldCheck, RefreshCw, KeyRound, AlertTriangle, Save, Smartphone, MapPin, Clock, Plus, Activity, Send } from "lucide-react";
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
    setLoading(true);
    setSaveSuccess(false);

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 sm:p-6 max-w-7xl mx-auto text-[#e0dafc]">
      {/* Tab 2 Form Panel */}
      <div className="lg:col-span-2 bg-[#2c3353] rounded-2xl border border-[#5d6fa3]/30 shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#5d6fa3]/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#1e233a] rounded-lg flex items-center justify-center text-[#e0dafc] border border-[#5d6fa3]/20">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white" id="profile-section-title">Emergency Core Profile</h2>
              <p className="text-xs text-[#5d6fa3] mt-0.5">Vital responder statistics synced to secure fallback channels</p>
            </div>
          </div>

          <div className="shrink-0">
            {lastNomineeActive ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-950/40 border border-green-800/60 rounded-xl text-xs text-green-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="font-semibold text-xs">Nominee Portal Active</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1e233a] border border-[#5d6fa3]/20 rounded-xl text-xs text-[#5d6fa3]">
                <span className="h-2 w-2 rounded-full bg-gray-600" />
                <span className="font-semibold text-xs">Nominee Portal Inactive</span>
              </div>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-4 bg-green-950/40 border border-green-900/50 text-green-400 p-3.5 rounded-xl text-xs font-semibold animate-fade-in" id="profile-save-success">
            ✓ Your vital resilience metadata and Nominee configurations have been persisted and secured.
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* PERSONAL INFORMATION */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              PERSONAL RESILIENCE PARAMETERS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                  placeholder="Alex Mercer"
                  id="profile-input-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Age</label>
                  <input
                    type="number"
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                    placeholder="34"
                    id="profile-input-age"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
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
          <div className="border-t border-[#5d6fa3]/20 pt-4 space-y-2">
            <label className="block text-xs font-extrabold uppercase text-indigo-300 tracking-wider">Medical Alert Information</label>
            <textarea
              value={medicalInfo}
              onChange={(e) => setMedicalInfo(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl focus:outline-none focus:border-[#e0dafc] text-xs resize-none text-[#e0dafc]"
              placeholder="Allergies, chronic conditions, prescriptions, insurance numbers, active treatments..."
              id="profile-input-medical"
            />
          </div>

          {/* TRUSTED EMERGENCY CONTACTS (CRUD) */}
          <div className="border-t border-[#5d6fa3]/20 pt-4 space-y-4">
            <div>
              <h3 className="text-xs font-extrabold uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                Trusted Emergency Contacts (Trusted Contacts CRUD)
              </h3>
              <p className="text-[11px] text-[#5d6fa3] mt-1 leading-relaxed">
                Build your circle of trusted medical responders, family members, or legal guardians. Give them permission to view specific documents or contact medical desks.
              </p>
            </div>

            {/* Contacts Table */}
            <div className="overflow-x-auto rounded-xl border border-[#5d6fa3]/20 bg-[#1e233a]/45">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#5d6fa3]/20 bg-[#1e233a]/80 text-[#5d6fa3] font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Relation</th>
                    <th className="py-3 px-4">Phone / Email</th>
                    <th className="py-3 px-4 text-center">Nominee Access</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#5d6fa3]/10">
                  {trustedContacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-[#5d6fa3]">
                        No additional trusted contacts registered. Add your first below!
                      </td>
                    </tr>
                  ) : (
                    trustedContacts.map((contact, index) => (
                      <tr key={contact.id || index} className="hover:bg-[#1e233a]/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{contact.name}</td>
                        <td className="py-3 px-4 text-indigo-200">{contact.relation}</td>
                        <td className="py-3 px-4 text-[#e0dafc]/80 font-mono">
                          <div>{contact.phone}</div>
                          {contact.email && <div className="text-[10px] text-[#5d6fa3]">{contact.email}</div>}
                        </td>
                        <td className="py-3 px-4 text-center">
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
                            <div className="w-9 h-5 bg-[#2c3353] border border-[#5d6fa3]/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = trustedContacts.filter((_, i) => i !== index);
                              setTrustedContacts(updated);
                            }}
                            className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/20 px-2 py-1 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Register New Form Container */}
            <div className="bg-[#1e233a]/30 border border-[#5d6fa3]/10 rounded-xl p-4 space-y-4">
              <h4 className="text-[11px] font-black uppercase text-[#e0dafc] tracking-wider flex items-center gap-1">
                <Plus className="h-3.5 w-3.5 text-indigo-400" />
                REGISTER NEW TRUSTED CONTACT
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-[#5d6fa3] font-bold">Full Name</label>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-lg p-2 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                    placeholder="e.g. Dr. Ramesh Gupta"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-[#5d6fa3] font-bold">Relationship</label>
                  <input
                    type="text"
                    value={newContactRelation}
                    onChange={(e) => setNewContactRelation(e.target.value)}
                    className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-lg p-2 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                    placeholder="e.g. Family Physician"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-[#5d6fa3] font-bold">Phone Number</label>
                  <input
                    type="tel"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-lg p-2 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                    placeholder="+91 99000-00001"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-[#5d6fa3] font-bold">Email Address</label>
                  <input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-lg p-2 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                    placeholder="doctor@apollo.com"
                  />
                </div>
              </div>

              {contactError && (
                <div className="text-xs text-red-400 font-medium px-1">
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
                  className="bg-[#2c3353] hover:bg-[#1e233a] text-white border border-[#5d6fa3]/40 hover:border-[#e0dafc] font-bold py-2 px-5 rounded-lg text-xs transition-all shadow-md"
                >
                  Add Contact
                </button>
              </div>
            </div>
          </div>

          {/* IMMEDIATE EMERGENCY RESPONDERS */}
          <div className="border-t border-[#5d6fa3]/20 pt-4 space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              IMMEDIATE EMERGENCY RESPONDERS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Primary Emergency Contact Name</label>
                <input
                  type="text"
                  required
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                  placeholder="Sarah Mercer (Spouse)"
                  id="profile-input-contact-name"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Primary Contact Phone Number</label>
                <input
                  type="tel"
                  required
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                  placeholder="+1 (555) 019-2834"
                  id="profile-input-contact-phone"
                />
              </div>
            </div>
          </div>

          {/* PRIMARY NOMINEE CREDENTIALS */}
          <div className="border-t border-[#5d6fa3]/25 pt-4 space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
              <KeyRound className="h-4 w-4" />
              PRIMARY NOMINEE CREDENTIALS
            </h3>
            
            <div className="bg-[#1e233a]/60 border border-[#5d6fa3]/20 rounded-xl p-4 text-xs space-y-1.5">
              <p className="font-bold text-[#e0dafc]">Nominee Rule:</p>
              <p className="text-[#a5b4fc] leading-relaxed">
                This individual is your primary legal nominee. They will have authorized permission to log in and access your continuity plan and essential records during crisis mode using their phone number and your Emergency PIN.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Nominee Full Name</label>
                <input
                  type="text"
                  required
                  value={nomineeName}
                  onChange={(e) => setNomineeName(e.target.value)}
                  className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                  placeholder="Nominee Legal Name"
                  id="profile-input-nominee-name"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Nominee Registered Phone Number</label>
                <input
                  type="tel"
                  required
                  value={nomineePhone}
                  onChange={(e) => setNomineePhone(e.target.value)}
                  className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                  placeholder="+1 (555) 012-3456"
                  id="profile-input-nominee-phone"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Emergency Access PIN</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={nomineePin}
                  onChange={(e) => setNomineePin(e.target.value)}
                  className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc] font-mono tracking-widest text-center"
                  placeholder="4-digit PIN (e.g. 8829)"
                  id="profile-input-nominee-pin"
                />
              </div>
            </div>

            <div className="text-[11px] bg-indigo-950/40 border border-indigo-900/40 text-indigo-300 p-3.5 rounded-xl space-y-1">
              <span className="font-extrabold uppercase tracking-wider block">Sandbox Testing Guide:</span>
              <p className="leading-relaxed">
                Log out and access the **Nominee Access** tab with nominee phone number <span className="font-mono font-bold text-white">{nomineePhone || "+1 (555) 012-3456"}</span> and your custom PIN <span className="font-mono font-bold text-white">{nomineePin || "1234"}</span>. You will receive a mock OTP <span className="font-bold text-white">7777</span> dynamically sent on screen!
              </p>
            </div>
          </div>

          {/* SAFETY MONITORING (Life Streak) */}
          <div className="border-t border-[#5d6fa3]/25 pt-4 space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              SAFETY MONITORING (LIFE STREAK)
            </h3>
            <p className="text-[11px] text-[#5d6fa3] leading-relaxed">
              If you do not check in for the streak duration plus the grace period, we email you a check-in confirmation. If you do not confirm within 12 hours, your emergency nominee is notified. Never alarmed immediately — you are always asked first.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Emergency Nominee Name</label>
                <input
                  type="text"
                  value={emergencyNomineeName}
                  onChange={(e) => setEmergencyNomineeName(e.target.value)}
                  className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                  placeholder="Sarah Mercer"
                  id="profile-input-nominee-email-name"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Emergency Nominee Email</label>
                <input
                  type="email"
                  value={emergencyNomineeEmail}
                  onChange={(e) => setEmergencyNomineeEmail(e.target.value)}
                  className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                  placeholder="nominee@example.com"
                  id="profile-input-nominee-email"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Streak Duration (days)</label>
                <input
                  type="number"
                  min={1}
                  value={streakDuration}
                  onChange={(e) => setStreakDuration(Number(e.target.value))}
                  className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                  placeholder="7"
                  id="profile-input-streak-duration"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Grace Period (hours)</label>
                <input
                  type="number"
                  min={0}
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(Number(e.target.value))}
                  className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                  placeholder="24"
                  id="profile-input-grace-period"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#1e233a]/60 border border-[#5d6fa3]/20 rounded-xl p-3.5">
                <p className="text-[10px] uppercase font-bold text-[#5d6fa3] tracking-wider">Last Active</p>
                <p className="text-xs font-bold text-white mt-1">
                  {lastActiveTimestamp
                    ? new Date(lastActiveTimestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "No activity recorded yet"}
                </p>
              </div>
              <div className="bg-[#1e233a]/60 border border-[#5d6fa3]/20 rounded-xl p-3.5">
                <p className="text-[10px] uppercase font-bold text-[#5d6fa3] tracking-wider">Current Status</p>
                <p className={`text-xs font-black mt-1 ${currentStreakStatus === "Safe" ? "text-green-400" : currentStreakStatus === "Awaiting Confirmation" ? "text-amber-400" : "text-red-400"}`}>
                  {currentStreakStatus}
                </p>
              </div>
              <div className="bg-[#1e233a]/60 border border-[#5d6fa3]/20 rounded-xl p-3.5 flex flex-col justify-between">
                <p className="text-[10px] uppercase font-bold text-[#5d6fa3] tracking-wider">Test (dev only)</p>
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testEmailSending}
                  className="mt-1 inline-flex items-center gap-1.5 bg-indigo-950/40 border border-indigo-800/50 text-indigo-300 hover:bg-indigo-900/40 hover:text-indigo-200 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all self-start cursor-pointer"
                  id="btn-test-emergency-email"
                >
                  <Send className="h-3 w-3" />
                  {testEmailSending ? "Sending..." : "Test Emergency Email"}
                </button>
                {testEmailResult && <p className="text-[9px] text-[#5d6fa3] mt-1">{testEmailResult}</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#e0dafc] hover:brightness-110 text-[#2c3353] font-black py-2.5 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2 text-xs"
              id="profile-btn-save"
            >
              <Save className="h-4 w-4 text-[#2c3353]" />
              {loading ? "Saving Records..." : "Save Profiles"}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Device Center Panel */}
      <div className="space-y-6">
        {/* MFA Center */}
        <div className="bg-[#2c3353] rounded-2xl border border-[#5d6fa3]/30 shadow-lg p-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-[#e0dafc]" />
            Multi-Factor Auth (MFA)
          </h3>
          <div className="flex items-center justify-between bg-[#1e233a] p-4 rounded-xl border border-[#5d6fa3]/20">
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold ${
                mfaEnabled ? "bg-green-950/50 text-green-400 border border-green-800/60" : "bg-amber-950/50 text-amber-400 border border-amber-800/60"
              }`}>
                {mfaEnabled ? "Secured — MFA enabled" : "Unsecured — MFA disabled"}
              </span>
              <p className="text-[10px] text-[#5d6fa3] mt-1.5">Requiring SMS or authenticator passkey verification</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={mfaEnabled}
                onChange={(e) => setMfaEnabled(e.target.checked)}
                className="sr-only peer"
                id="checkbox-mfa"
              />
              <div className="w-11 h-6 bg-[#1e233a] border border-[#5d6fa3]/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e0dafc]"></div>
            </label>
          </div>
        </div>

        {/* Device Sessions */}
        <div className="bg-[#2c3353] rounded-2xl border border-[#5d6fa3]/30 shadow-lg p-6">
          <div className="flex items-center justify-between mb-4 border-b border-[#5d6fa3]/20 pb-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-[#e0dafc]" />
              Active Device Sessions
            </h3>
            <button
              onClick={fetchSessionsAndAlerts}
              className="p-1 hover:bg-[#1e233a]/60 rounded-lg text-[#e0dafc] transition-colors"
              id="btn-refresh-sessions"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {sessions.map((sess) => (
              <div key={sess.id} className="p-3 border border-[#5d6fa3]/20 rounded-xl bg-[#1e233a] flex justify-between items-start text-xs hover:border-[#5d6fa3]/40 transition-colors">
                <div className="space-y-1">
                  <p className="font-semibold text-white">{sess.device}</p>
                  <p className="text-[10px] text-[#5d6fa3] flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {sess.location}
                  </p>
                  <p className="text-[10px] text-[#5d6fa3] flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(sess.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeSession(sess.id)}
                  className="text-[10px] text-red-400 font-bold hover:bg-red-950/40 px-2 py-1 rounded-lg border border-red-900/40 shrink-0 transition-all"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security Alerts */}
        <div className="bg-[#2c3353] rounded-2xl border border-[#5d6fa3]/30 shadow-lg p-6 max-h-[300px] overflow-y-auto">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4 sticky top-0 bg-[#2c3353] py-1 border-b border-[#5d6fa3]/20">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Live Security Feed
          </h3>
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <p className="text-xs text-[#5d6fa3] text-center py-4">No recent security anomalies on record.</p>
            ) : (
              alerts.map((al) => (
                <div key={al.id} className="relative pl-4 border-l-2 border-amber-500 space-y-1 animate-fade-in">
                  <p className="text-xs font-bold text-white">{al.event}</p>
                  <p className="text-[10px] text-[#e0dafc]/80">{al.details}</p>
                  <p className="text-[9px] text-[#5d6fa3]">
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
