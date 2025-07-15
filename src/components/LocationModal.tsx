'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin, FileText, Truck, Trash2, CreditCard, Store } from 'lucide-react';

interface Plan {
  title: string;
  monthly_price: {
    amount: number;
    currency: string;
  };
  yearly_price: {
    amount: number;
    currency: string;
  };
  features: {
    [key: string]: string;
  };
  detailed_features: {
    [key: string]: string;
  };
  service_plan_id: string;
}

interface LocationInfo {
  address_title: string;
  address_text: string;
  street_address: string;
  suite_info: string;
  city_state_zip: string;
  country: string;
  features: Array<{
    name: string;
    available: boolean;
  }>;
  shipping_carriers: string[];
  operator_info: {
    name: string;
    verified: boolean;
  };
}

interface Location {
  title: string;
  price: {
    amount: number;
    currency: string;
  };
  address: string;
  latitude: string;
  longitude: string;
  plan_url: string;
  is_premier: boolean;
  plans: Plan[];
  location_info: LocationInfo;
}

interface LocationModalProps {
  location: Location | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LocationModal({ location, isOpen, onClose }: LocationModalProps) {
  if (!location) return null;

  // Function to replace pricing text with "Available"
  const replacePricingText = (text: string): string => {
    if (!text) return text;
    
    // Check if text contains pricing information (currency symbols, numbers with $, etc.)
    const pricingPatterns = [
      /\b[A-Z]{1,3}\$?\s*\d+\.?\d*\b/g,  // USD 10.00, US$ 5.50, etc.
      /\$\d+\.?\d*/g,                     // $10.00, $5.50, etc.
      /\€\d+\.?\d*/g,                     // €10.00, €5.50, etc.
      /\£\d+\.?\d*/g,                     // £10.00, £5.50, etc.
      /\¥\d+\.?\d*/g,                     // ¥10.00, ¥5.50, etc.
      /\d+\s*(usd|eur|gbp|jpy|cad|aud)/gi, // 10 USD, 5 EUR, etc.
      /\d+\s*\/\s*month/gi,               // 10 / month
      /\d+\s*\/\s*year/gi,                // 10 / year
      /\d+\s*per\s*visit/gi,              // 10 per visit
      /\d+\s*for\s*every/gi,              // 10 for every
      /\d+\s*day\(s\)/gi,                 // 30 day(s)
      /\d+\s*page\(s\)/gi,                // 5 page(s)
      /\d+\s*additional/gi,               // 10 additional
    ];
    
    let modifiedText = text;
    pricingPatterns.forEach(pattern => {
      modifiedText = modifiedText.replace(pattern, 'Available');
    });
    
    // Replace common pricing phrases
    const pricingPhrases = [
      /Each additional at .*/gi,
      /Each additional page at .*/gi,
      /Each shipping bundle at .*/gi,
      /Shipping fees will apply/gi,
      /Each at .*/gi,
      /per visit/gi,
      /Pickup during business hours/gi,
      /Free storage for .*/gi,
      /then .*/gi,
      /Each additional .*/gi,
      /\/ month/gi,
      /\/ year/gi,
    ];
    
    pricingPhrases.forEach(phrase => {
      modifiedText = modifiedText.replace(phrase, 'Available');
    });
    
    // Clean up multiple "Available" instances
    modifiedText = modifiedText.replace(/Available\s*\/\s*Available/g, 'Available');
    modifiedText = modifiedText.replace(/Available\s*Available/g, 'Available');
    modifiedText = modifiedText.replace(/Available\s*\n\s*Available/g, 'Available');
    
    return modifiedText.trim();
  };

  const getFeatureIcon = (featureName: string) => {
    switch (featureName.toLowerCase()) {
      case 'open & scan':
        return <FileText className="w-4 h-4" />;
      case 'forwarding':
        return <Truck className="w-4 h-4" />;
      case 'recycling':
        return <Trash2 className="w-4 h-4" />;
      case 'check deposit':
        return <CreditCard className="w-4 h-4" />;
      case 'local pickup':
        return <Store className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {location.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Location Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Address</p>
                  <p className="font-medium">{location.address}</p>
                </div>



                {location.is_premier && (
                  <Badge variant="premium" className="w-fit">
                    Premier Location
                  </Badge>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-2">Available Services</p>
                  <div className="flex flex-wrap gap-2">
                    {location.location_info.features.map((feature, index) => (
                      <Badge
                        key={index}
                        variant={feature.available ? "default" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        {getFeatureIcon(feature.name)}
                        {feature.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Shipping Carriers</p>
                  <div className="flex flex-wrap gap-1">
                    {location.location_info.shipping_carriers.map((carrier, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {carrier}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Operator</p>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{location.location_info.operator_info.name}</span>
                    {location.location_info.operator_info.verified && (
                      <Badge variant="secondary" className="text-xs">Verified</Badge>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => window.open(location.plan_url, '_blank')}
                  className="w-full cursor-pointer"
                  variant="outline"
                >
                  <ExternalLink className="w-4 h-4 mr-2 " />
                  View on Anytime Mailbox
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Plans/Tiers */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Available Plans</CardTitle>
                <CardDescription>
                  Choose from our range of mailbox plans to suit your needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={location.plans[0]?.title || ""} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    {location.plans.map((plan) => (
                      <TabsTrigger
                        key={plan.title}
                        value={plan.title}
                        onClick={() => {}}
                        className="text-xs cursor-pointer"
                      >
                        {plan.title}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {location.plans.map((plan) => (
                    <TabsContent key={plan.title} value={plan.title} className="mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pricing */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">{plan.title} Plan</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            

                            <div className="space-y-3">
                              <h4 className="font-semibold">Key Features</h4>
                              {Object.entries(plan.features).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center">
                                  <span className="text-sm">{key}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {replacePricingText(value)}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Detailed Features */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Detailed Features</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {Object.entries(plan.detailed_features).map(([key, value]) => {
                                if (key === 'pricing') return null;
                                return (
                                  <div key={key} className="border-b pb-2 last:border-b-0">
                                    <h5 className="font-medium text-sm mb-1">{key}</h5>
                                    <p className="text-xs text-gray-600 whitespace-pre-line">{replacePricingText(value)}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 