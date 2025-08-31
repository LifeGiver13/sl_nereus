import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  category: z.string().min(1, 'Category is required'),
  subCategory: z.string().optional(),
});

type SkillFormData = z.infer<typeof skillSchema>;

interface Skill {
  id: number;
  name: string;
  category: string;
  subCategory?: string;
  meta?: {
    fortunaID: number;
    disabled?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface SkillFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SkillFormData) => Promise<void>;
  skill?: Skill | null;
  isLoading: boolean;
}

const SkillFormModal = ({ isOpen, onClose, onSubmit, skill, isLoading }: SkillFormModalProps) => {
  const form = useForm<SkillFormData>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      name: skill?.name || '',
      category: skill?.category || '',
      subCategory: skill?.subCategory || '',
    },
  });

  React.useEffect(() => {
    if (skill) {
      form.reset({
        name: skill.name,
        category: skill.category,
        subCategory: skill.subCategory || '',
      });
    } else {
      form.reset({
        name: '',
        category: '',
        subCategory: '',
      });
    }
  }, [skill, form]);

  const handleSubmit = async (data: SkillFormData) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Error submitting skill:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{skill ? 'Edit Skill' : 'Create New Skill'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skill Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter skill name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter category" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="subCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategory (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter subcategory" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : skill ? 'Update Skill' : 'Create Skill'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SkillFormModal;