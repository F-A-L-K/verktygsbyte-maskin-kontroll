import React, { useEffect, useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel 
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { MachineId, ToolCompensation } from "@/types";
import { useLastManufacturingOrder } from "@/hooks/useLastManufacturingOrder";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  manufacturingOrder: z.string().min(1, "Tillverkningsorder är obligatoriskt"),
  coordinateSystem: z.string().optional(),
  tool: z.string().optional(),
  number: z.string().optional(),
  direction: z.enum(["X", "Y", "Z", "R", "L"], {
    required_error: "Välj en kompenseringsriktning",
  }),
  value: z.string()
    .regex(/^[+-]?\d*\.?\d+$/, "Måste vara ett nummer med eventuellt +/- tecken")
    .min(1, "Kompenseringsvärde är obligatoriskt"),
  comment: z.string().optional(),
  signature: z.string({
    required_error: "Välj en signatur",
  }),
}).refine(data => data.coordinateSystem || data.tool || data.number, {
  message: "Minst ett av koordinatsystem, verktyg eller nummer måste anges",
});

interface ToolCompensationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (compensation: ToolCompensation) => void;
  machineId: MachineId;
  defaultManufacturingOrder?: string;
}

export default function ToolCompensationForm({ 
  open, 
  onOpenChange, 
  onSubmit,
  machineId,
  defaultManufacturingOrder = ""
}: ToolCompensationFormProps) {
  const { getLastOrder } = useLastManufacturingOrder();
  const [signatures, setSignatures] = useState<string[]>([]);

  useEffect(() => {
    const fetchSignatures = async () => {
      try {
        const { data, error } = await supabase
          .from('signatures' as any)
          .select('name');
        
        if (error) {
          console.error("Error fetching signatures:", error);
          return;
        }
        
        if (data && Array.isArray(data)) {
          const names = data.map((item: any) => item.name).filter(Boolean);
          setSignatures(names);
        }
      } catch (err) {
        console.error("Exception when fetching signatures:", err);
      }
    };

    fetchSignatures();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      manufacturingOrder: defaultManufacturingOrder || getLastOrder(machineId) || "",
      coordinateSystem: "",
      tool: "",
      number: "",
      direction: undefined,
      value: "",
      comment: "",
      signature: undefined,
    },
  });

  useEffect(() => {
    form.setValue('manufacturingOrder', defaultManufacturingOrder || getLastOrder(machineId) || "");
  }, [defaultManufacturingOrder, machineId, getLastOrder, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const newCompensation: ToolCompensation = {
      id: crypto.randomUUID(),
      machineId,
      manufacturingOrder: values.manufacturingOrder,
      coordinateSystem: values.coordinateSystem || undefined,
      tool: values.tool || undefined,
      number: values.number || undefined,
      direction: values.direction,
      value: values.value,
      comment: values.comment || "",
      signature: values.signature,
      timestamp: new Date(),
    };
    
    onSubmit(newCompensation);
    form.reset({
      ...form.formState.defaultValues,
      manufacturingOrder: values.manufacturingOrder,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ny verktygskompensering - Maskin {machineId}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="manufacturingOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tillverkningsorder</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ange tillverkningsorder" />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="coordinateSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Koordinatsystem</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ange koord. sys." />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tool"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verktyg</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ange verktyg" />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nummer</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ange nummer" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kompenseringsriktning</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj riktning" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="X">X</SelectItem>
                        <SelectItem value="Y">Y</SelectItem>
                        <SelectItem value="Z">Z</SelectItem>
                        <SelectItem value="R">R</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kompenseringsvärde</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ange värde (t.ex. +0.15)" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="signature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Signatur</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj signatur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {signatures.map(sig => (
                        <SelectItem key={sig} value={sig}>{sig}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kommentar</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Skriv en kommentar (valfritt)" 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Avbryt
              </Button>
              <Button type="submit">Spara</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
