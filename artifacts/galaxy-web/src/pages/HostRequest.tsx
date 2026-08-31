// src/pages/HostRequest.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  searchAgencyById,
  submitHostApplication,
  getHost,
  getUserHostApplication,
  getUserKyc,
  submitKyc,
  requestPayout,
} from '@/services/hostService'; // ensure these functions exist
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import {
  Loader2,
  CheckCircle,
  ArrowLeft,
  Home,
  ShieldCheck,
  Wallet,
  Crown,
} from 'lucide-react';

type HostStatus = 'none' | 'pending' | 'approved' | 'rejected';

export default function HostRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ---------- HOST REQUEST STATES ----------
  const [status, setStatus] = useState<HostStatus>('none');
  const [loading, setLoading] = useState(true);
  const [agencyCode, setAgencyCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [foundAgency, setFoundAgency] = useState<any>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const uniqueId = user?.uid || '';

  // ---------- KYC STATES ----------
  const [kyc, setKyc] = useState<any>(null);
  const [kycLoading, setKycLoading] = useState(true);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycFields, setKycFields] = useState({
    fullName: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    country: '',
    idType: 'Passport',
    idNumber: '',
    age: '',
    address: '',
    frontUrl: '',
    backUrl: '',
  });

  // ---------- REDEEM STATES ----------
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [payoutCoins, setPayoutCoins] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('UPI');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);

  // ---------- CHECK USER STATUS ----------
  useEffect(() => {
    const checkStatus = async () => {
      if (!user) return;
      try {
        // 1. Check if user is already a host
        const host = await getHost(user.uid);
        if (host && host.status === 'active') {
          setStatus('approved');
          setTotalEarnings(host.earnings?.total || 0);
          setLoading(false);
          return;
        }

        // 2. Check for pending/rejected application
        const appRef = ref(db, 'hostApplications');
        const snap = await get(appRef);
        if (snap.exists()) {
          const apps = snap.val();
          for (const key in apps) {
            if (apps[key].userId === user.uid) {
              setApplicationId(key);
              if (apps[key].status === 'pending' || apps[key].status === 'under_review') {
                setStatus('pending');
                setLoading(false);
                return;
              } else if (apps[key].status === 'rejected') {
                setStatus('rejected');
                setLoading(false);
                return;
              }
            }
          }
        }
        setStatus('none');
      } catch (error) {
        console.error(error);
        setStatus('none');
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, [user]);

  // ---------- FETCH KYC ----------
  useEffect(() => {
    if (!user) return;
    getUserKyc(user.uid)
      .then((data) => { setKyc(data); setKycLoading(false); })
      .catch(() => setKycLoading(false));
  }, [user]);

  // ---------- HANDLERS ----------
  const handleSearchAgency = async () => {
    if (!agencyCode.trim()) {
      toast({ title: 'Enter Agency Code', variant: 'destructive' });
      return;
    }
    setIsSearching(true);
    try {
      const agency = await searchAgencyById(agencyCode.trim());
      if (agency) {
        setFoundAgency(agency);
        toast({ title: 'Agency found!', description: agency.name });
      } else {
        setFoundAgency(null);
        toast({ title: 'Not found', description: 'Invalid Agency Code', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    setIsSubmitting(true);
    try {
      await submitHostApplication({
        userId: user?.uid || '',
        displayName: user?.displayName || 'User',
        about: 'Requesting to become a host' + (foundAgency ? ` for ${foundAgency.name}` : ''),
        agencyId: foundAgency?.id || null,
      });
      toast({
        title: 'Request Sent! 🎉',
        description: foundAgency
          ? `Your request to join ${foundAgency.name} has been sent.`
          : 'Your host application has been submitted.',
      });
      setStatus('pending');
    } catch (error) {
      toast({ title: 'Failed to send request', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycFields.fullName.trim() || !kycFields.idNumber.trim() || !kycFields.frontUrl.trim()) {
      toast({ title: 'Full name, ID number and document URL are required.', variant: 'destructive' });
      return;
    }
    setKycSubmitting(true);
    try {
      await submitKyc(user?.uid || '', {
        userId: user?.uid || '',
        userName: user?.displayName || '',
        fullName: kycFields.fullName,
        email: kycFields.email,
        phone: kycFields.phone,
        country: kycFields.country,
        idType: kycFields.idType,
        idNumber: kycFields.idNumber,
        age: Number(kycFields.age) || 0,
        address: kycFields.address,
        documents: {
          front: { name: 'ID document', url: kycFields.frontUrl, status: 'pending' },
          ...(kycFields.backUrl ? { back: { name: 'Back side', url: kycFields.backUrl, status: 'pending' } } : {}),
        },
      });
      const updated = await getUserKyc(user?.uid || '');
      setKyc(updated);
      toast({ title: 'KYC submitted for review.', variant: 'success' });
    } catch (err: any) {
      toast({ title: err?.message || 'KYC submission failed.', variant: 'destructive' });
    } finally {
      setKycSubmitting(false);
    }
  };

  const handleRedeemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const coins = Number(payoutCoins);
    if (!coins || !payoutDetails.trim()) {
      toast({ title: 'Enter coins and payment details.', variant: 'destructive' });
      return;
    }
    setPayoutLoading(true);
    try {
      await requestPayout(user?.uid || '', {
        userId: user?.uid || '',
        name: user?.displayName || '',
        avatar: user?.photoURL || '',
        totalEarnings,
        agencyRole: '',
      }, coins, payoutMethod, { account: payoutDetails.trim() });
      setPayoutCoins('');
      setPayoutDetails('');
      toast({ title: 'Redeem request submitted to admin.', variant: 'success' });
    } catch (err: any) {
      toast({ title: err?.message || 'Redeem request failed.', variant: 'destructive' });
    } finally {
      setPayoutLoading(false);
    }
  };

  // ---------- RENDER ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070713] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  const renderMainContent = () => {
    if (status === 'approved') {
      return (
        <div className="text-center space-y-4 py-6">
          <div className="text-6xl mb-2">🎉</div>
          <h2 className="text-2xl font-bold text-white">You are now a Host!</h2>
          <p className="text-[#A9A6BD]">Your host account is active. Start hosting and earning rewards.</p>
          <Button className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7]" onClick={() => navigate('/host-dashboard')}>
            <Home className="w-4 h-4 mr-2" /> Go to Dashboard
          </Button>
        </div>
      );
    }
    if (status === 'pending') {
      return (
        <div className="text-center space-y-4 py-6">
          <div className="text-6xl mb-2">⏳</div>
          <h2 className="text-2xl font-bold text-[#F5B83D]">Application Under Review</h2>
          <p className="text-[#A9A6BD]">Admin is reviewing your request. You'll be notified when approved.</p>
          <div className="bg-[#121027] border border-[#F5B83D]/20 rounded-xl p-4 text-left">
            <p className="text-sm text-[#A9A6BD]">Application ID</p>
            <p className="text-white font-mono text-sm">{applicationId || 'N/A'}</p>
          </div>
        </div>
      );
    }
    if (status === 'rejected') {
      return (
        <div className="text-center space-y-4 py-6">
          <div className="text-6xl mb-2">😞</div>
          <h2 className="text-2xl font-bold text-red-400">Application Rejected</h2>
          <p className="text-[#A9A6BD]">You can try again with a new request.</p>
          <Button className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7]" onClick={() => setStatus('none')}>
            Try Again
          </Button>
        </div>
      );
    }
    // none → show the request form
    return (
      <>
        <div>
          <label className="text-sm text-[#A9A6BD] font-medium">Unique Id</label>
          <div className="mt-1 px-4 py-3 bg-[#121027] border border-[#292344] rounded-xl text-white font-mono text-sm">
            {uniqueId || 'Loading...'}
          </div>
        </div>
        <div>
          <label className="text-sm text-[#A9A6BD] font-medium">Agency Code (optional)</label>
          <div className="flex gap-2 mt-1">
            <Input
              value={agencyCode}
              onChange={(e) => setAgencyCode(e.target.value.toUpperCase())}
              placeholder="Enter agency code..."
              className="flex-1 bg-[#121027] border-[#292344] text-white rounded-xl placeholder:text-[#555]"
            />
            <Button
              variant="outline"
              onClick={handleSearchAgency}
              disabled={isSearching || !agencyCode.trim()}
              className="border-[#292344] text-[#A9A6BD] hover:text-white hover:border-[#7C3AED]"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </div>
          <p className="text-xs text-[#555] mt-1">If you don't have an agency code, leave it blank.</p>
        </div>
        {foundAgency && (
          <div className="bg-[#121027] border border-[#7C3AED]/30 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">{foundAgency.name}</p>
              <p className="text-[#A9A6BD] text-xs">ID: {foundAgency.agencyId}</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
        )}
        <Button
          className="w-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] py-6 rounded-xl text-lg font-semibold"
          onClick={handleSendRequest}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Send Request'}
        </Button>
      </>
    );
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* ✅ Full screen background with Cloudinary image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://res.cloudinary.com/dz1bhfpkc/image/upload/v1787745133/Screenshot_20260826_172044_Gallery_kjro8s.jpg"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback gradient if image fails to load
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement.className =
              'absolute inset-0 z-0 bg-gradient-to-br from-[#070713] via-[#0D0B1D] to-[#121027]';
          }}
        />
        <div className="absolute inset-0 bg-black/60 z-1"></div>
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-20 flex items-center text-[#A9A6BD] hover:text-white transition"
      >
        <ArrowLeft className="w-5 h-5 mr-1" /> Back
      </button>

      {/* Main Card */}
      <Card className="relative z-10 bg-[#0D0B1D]/90 backdrop-blur-sm border-[#292344] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-[#7C3AED]/10">
        <CardContent className="p-6 space-y-5">
          <div className="text-center">
            {status === 'none' ? (
              <>
                <h2 className="text-xl font-bold text-white tracking-wide">REQUEST TO JOIN</h2>
                <p className="text-[#7C3AED] text-lg font-semibold">HOST AGENCY</p>
              </>
            ) : (
              <h2 className="text-xl font-bold text-white tracking-wide">Host Application Status</h2>
            )}
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-[#7C3AED]/50 to-transparent" />

          {renderMainContent()}

          {/* KYC & Redeem Tabs – show only if user has applied or is host */}
          {(status === 'pending' || status === 'approved' || status === 'rejected') && (
            <div className="pt-4 border-t border-[#292344]">
              <Tabs defaultValue="kyc" className="space-y-4">
                <TabsList className="bg-[#0D0B1D] border border-[#292344] p-1 rounded-xl w-full">
                  <TabsTrigger value="kyc" className="flex-1 data-[state=active]:bg-[#7C3AED]">
                    <ShieldCheck className="w-4 h-4 mr-1" /> KYC
                  </TabsTrigger>
                  <TabsTrigger value="redeem" className="flex-1 data-[state=active]:bg-[#7C3AED]">
                    <Wallet className="w-4 h-4 mr-1" /> Redeem
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="kyc">
                  {kycLoading ? (
                    <div className="text-center py-4 text-[#A9A6BD]">Loading...</div>
                  ) : kyc?.status === 'pending' ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
                      <p className="text-yellow-400 font-semibold">⏳ KYC pending review</p>
                    </div>
                  ) : kyc?.status === 'approved' ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                      <p className="text-green-400 font-semibold">✅ KYC approved</p>
                    </div>
                  ) : (
                    <form onSubmit={handleKycSubmit} className="space-y-3">
                      <Input placeholder="Full legal name" value={kycFields.fullName} onChange={(e) => setKycFields({...kycFields, fullName: e.target.value})} className="bg-[#121027] border-[#292344] text-white" required />
                      <Input placeholder="Email" value={kycFields.email} onChange={(e) => setKycFields({...kycFields, email: e.target.value})} className="bg-[#121027] border-[#292344] text-white" />
                      <Input placeholder="Phone" value={kycFields.phone} onChange={(e) => setKycFields({...kycFields, phone: e.target.value})} className="bg-[#121027] border-[#292344] text-white" />
                      <Input placeholder="Country" value={kycFields.country} onChange={(e) => setKycFields({...kycFields, country: e.target.value})} className="bg-[#121027] border-[#292344] text-white" />
                      <select value={kycFields.idType} onChange={(e) => setKycFields({...kycFields, idType: e.target.value})} className="w-full bg-[#121027] border border-[#292344] rounded-xl px-4 py-3 text-white">
                        <option>Passport</option><option>National ID</option><option>Driving Licence</option>
                      </select>
                      <Input placeholder="ID Number" value={kycFields.idNumber} onChange={(e) => setKycFields({...kycFields, idNumber: e.target.value})} className="bg-[#121027] border-[#292344] text-white" required />
                      <Input placeholder="Age" value={kycFields.age} onChange={(e) => setKycFields({...kycFields, age: e.target.value})} className="bg-[#121027] border-[#292344] text-white" />
                      <Input placeholder="Address" value={kycFields.address} onChange={(e) => setKycFields({...kycFields, address: e.target.value})} className="bg-[#121027] border-[#292344] text-white" />
                      <Input placeholder="ID Document URL (front)" value={kycFields.frontUrl} onChange={(e) => setKycFields({...kycFields, frontUrl: e.target.value})} className="bg-[#121027] border-[#292344] text-white" required />
                      <Input placeholder="Back-side URL (optional)" value={kycFields.backUrl} onChange={(e) => setKycFields({...kycFields, backUrl: e.target.value})} className="bg-[#121027] border-[#292344] text-white" />
                      <Button type="submit" disabled={kycSubmitting} className="w-full bg-[#2DD4BF] hover:bg-[#14b8a6] text-black font-bold">
                        {kycSubmitting ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Submit KYC'}
                      </Button>
                    </form>
                  )}
                </TabsContent>
                <TabsContent value="redeem">
                  {status === 'approved' && kyc?.status === 'approved' ? (
                    <form onSubmit={handleRedeemSubmit} className="space-y-3">
                      <div className="bg-[#121027] border border-[#292344] rounded-xl p-3">
                        <p className="text-sm text-[#A9A6BD]">Available Earnings</p>
                        <p className="text-2xl font-bold text-[#F5B83D]">{totalEarnings.toLocaleString()} coins</p>
                      </div>
                      <Input type="number" placeholder="Coins to redeem" value={payoutCoins} onChange={(e) => setPayoutCoins(e.target.value)} className="bg-[#121027] border-[#292344] text-white" required />
                      <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} className="w-full bg-[#121027] border border-[#292344] rounded-xl px-4 py-3 text-white">
                        <option>UPI</option><option>Bank Transfer</option><option>PayPal</option>
                      </select>
                      <Input placeholder="UPI ID / Bank details / PayPal email" value={payoutDetails} onChange={(e) => setPayoutDetails(e.target.value)} className="bg-[#121027] border-[#292344] text-white" required />
                      <Button type="submit" disabled={payoutLoading} className="w-full bg-gradient-to-r from-[#F5B83D] to-[#f97316] text-black font-bold">
                        {payoutLoading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Request Redeem'}
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center py-4 text-[#A9A6BD] text-sm">
                      {status !== 'approved' ? 'You need to be an approved host to redeem.' : 'Complete KYC before redeeming.'}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}