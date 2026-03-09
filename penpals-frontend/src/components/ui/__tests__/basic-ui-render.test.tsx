import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form@7.55.0';
import {
  ChartContainer,
  ChartStyle,
  ChartTooltipContent,
  ChartLegendContent,
} from '../chart';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../form';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '../resizable';
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '../sidebar';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogAction, AlertDialogCancel, AlertDialogTitle, AlertDialogDescription } from '../alert-dialog';
import { Button } from '../button';
import { Input } from '../input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../accordion';
import { AspectRatio } from '../aspect-ratio';
import { Avatar, AvatarImage, AvatarFallback } from '../avatar';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from '../breadcrumb';
import { Calendar } from '../calendar';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '../carousel';
import { Alert, AlertTitle, AlertDescription } from '../alert';
import { Badge } from '../badge';
import { Checkbox } from '../checkbox';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../collapsible';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../command';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '../dialog';
import {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from '../drawer';
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuShortcut,
} from '../dropdown-menu';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../hover-card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../input-otp';
import { Label } from '../label';
import {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarGroup,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarSeparator,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
  MenubarShortcut,
} from '../menubar';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from '../navigation-menu';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from '../pagination';
import { Popover, PopoverTrigger, PopoverContent } from '../popover';
import { Progress } from '../progress';
import { RadioGroup, RadioGroupItem } from '../radio-group';
import { ScrollArea } from '../scroll-area';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../select';
import { Separator } from '../separator';
import {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '../sheet';
import { Skeleton } from '../skeleton';
import { Slider } from '../slider';
import { Switch } from '../switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';
import { Textarea } from '../textarea';
import { ToggleGroup, ToggleGroupItem } from '../toggle-group';
import { Toggle } from '../toggle';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip';
import { VisuallyHidden } from '../visually-hidden';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from '../context-menu';
import { Toaster } from '../sonner';
import { useIsMobile } from '../use-mobile';

vi.mock('next-themes@0.4.6', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

describe('UI Components basic render', () => {
  it('renders AlertDialog and children', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogAction>OK</AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    );
  });

  it('renders Button', () => {
    render(<Button>Click me</Button>);
  });

  it('renders Input', () => {
    render(<Input placeholder="Type here" />);
  });

  it('renders Card and children', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
  });

  it('renders Accordion and children', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  });

  // Zero-coverage UI tests
  it('renders AspectRatio', () => {
    render(<AspectRatio />);
  });

  it('renders Avatar and children', () => {
    render(
      <Avatar>
        <AvatarImage src="/test.png" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
  });

  it('renders Breadcrumb and children', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Page</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbList>
      </Breadcrumb>
    );
  });

  it('renders Calendar', () => {
    render(<Calendar />);
  });

  it('renders Carousel and children', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    );
  });

  it('renders Alert and children', () => {
    render(
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
        <AlertDescription>Alert Description</AlertDescription>
      </Alert>
    );
  });

  it('renders Badge', () => {
    render(<Badge>Badge</Badge>);
  });

  it('renders Checkbox', () => {
    render(<Checkbox />);
  });

  it('renders Collapsible and children', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Trigger</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    );
  });

  it('renders Command and children', () => {
    render(
      <Command>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup heading="Group">
            <CommandItem>Item</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
  });

  it('renders Dialog and children', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );
  });

  it('renders Drawer and children', () => {
    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>Title</DrawerTitle>
          <DrawerDescription>Description</DrawerDescription>
        </DrawerContent>
      </Drawer>
    );
  });

  it('renders DropdownMenu and children', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  });

  it('renders HoverCard and children', () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Hover</HoverCardTrigger>
        <HoverCardContent>Content</HoverCardContent>
      </HoverCard>
    );
  });

  it('renders InputOTP and children', () => {
    render(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>
    );
  });

  it('renders Label', () => {
    render(<Label>Label</Label>);
  });

  it('renders Menubar and children', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Menu</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Item</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    );
  });

  it('renders NavigationMenu and children', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink>Link</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );
  });

  it('renders Pagination and children', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  });

  it('renders Popover and children', () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    );
  });

  it('renders Progress', () => {
    render(<Progress value={50} />);
  });

  it('renders RadioGroup and children', () => {
    render(
      <RadioGroup>
        <RadioGroupItem value="option1" id="option1" />
      </RadioGroup>
    );
  });

  it('renders ScrollArea', () => {
    render(<ScrollArea>Content</ScrollArea>);
  });

  it('renders Select and children', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="item1">Item 1</SelectItem>
        </SelectContent>
      </Select>
    );
  });

  it('renders Separator', () => {
    render(<Separator />);
  });

  it('renders Sheet and children', () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Title</SheetTitle>
          <SheetDescription>Description</SheetDescription>
        </SheetContent>
      </Sheet>
    );
  });

  it('renders Skeleton', () => {
    render(<Skeleton />);
  });

  it('renders Slider', () => {
    render(<Slider />);
  });

  it('renders Switch', () => {
    render(<Switch />);
  });

  it('renders Table and children', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  });

  it('renders Tabs and children', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
      </Tabs>
    );
  });

  it('renders Textarea', () => {
    render(<Textarea placeholder="Type here..." />);
  });

  it('renders ToggleGroup and children', () => {
    render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="option1">Option 1</ToggleGroupItem>
      </ToggleGroup>
    );
  });

  it('renders Toggle', () => {
    render(<Toggle>Toggle</Toggle>);
  });

  it('renders Tooltip and children', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  });

  it('renders VisuallyHidden', () => {
    render(<VisuallyHidden>Hidden content</VisuallyHidden>);
  });

  it('renders ContextMenu and children', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Right click</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Item</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  });
});

describe('UI advanced coverage', () => {
  it('renders chart primitives and custom content', () => {
    const config = {
      users: { label: 'Users', color: '#22c55e' },
      sales: { label: 'Sales', theme: { light: '#111111', dark: '#ffffff' } },
    };

    const tooltipPayload = [
      {
        name: 'users',
        dataKey: 'users',
        value: 42,
        color: '#22c55e',
        payload: { users: 'users', fill: '#22c55e' },
      },
    ] as any;

    const legendPayload = [
      { dataKey: 'users', value: 'users', color: '#22c55e' },
    ] as any;

    const { getAllByText, getByText } = render(
      <ChartContainer config={config} id="advanced-chart">
        <div>
          <ChartTooltipContent active payload={tooltipPayload} />
          <ChartLegendContent payload={legendPayload} />
        </div>
      </ChartContainer>
    );

    expect(getAllByText('Users').length).toBeGreaterThan(0);
    expect(getByText('42')).toBeInTheDocument();

    const { container } = render(<ChartStyle id="plain" config={{}} />);
    expect(container.querySelector('style')).toBeNull();
  });

  it('renders form components with react-hook-form context', () => {
    const FormHarness = () => {
      const methods = useForm<{ username: string }>({
        defaultValues: { username: '' },
      });

      return (
        <Form {...methods}>
          <form>
            <FormField
              control={methods.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <input aria-label="username" {...field} />
                  </FormControl>
                  <FormDescription>Your public username</FormDescription>
                  <FormMessage>Field message</FormMessage>
                </FormItem>
              )}
            />
          </form>
        </Form>
      );
    };

    const { getByText, getByLabelText } = render(<FormHarness />);
    expect(getByText('Username')).toBeInTheDocument();
    expect(getByText('Your public username')).toBeInTheDocument();
    expect(getByLabelText('username')).toBeInTheDocument();
  });

  it('renders resizable primitives', () => {
    render(
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={50}>Left</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50}>Right</ResizablePanel>
      </ResizablePanelGroup>
    );
  });

  it('renders sidebar components inside provider', () => {
    const { getByText, getAllByLabelText } = render(
      <SidebarProvider defaultOpen>
        <Sidebar>
          <SidebarHeader>
            <SidebarInput placeholder="Search" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Main</SidebarGroupLabel>
              <SidebarGroupAction aria-label="Group Action">+</SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Dashboard">Dashboard</SidebarMenuButton>
                    <SidebarMenuAction aria-label="Menu Action">A</SidebarMenuAction>
                    <SidebarMenuBadge>3</SidebarMenuBadge>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                </SidebarMenu>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton href="#">Sub Item</SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarSeparator />
          <SidebarFooter>Footer</SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger aria-label="Toggle Sidebar" />
          <div>Page Content</div>
        </SidebarInset>
      </SidebarProvider>
    );

    expect(getByText('Main')).toBeInTheDocument();
    expect(getByText('Dashboard')).toBeInTheDocument();
    fireEvent.click(getAllByLabelText('Toggle Sidebar')[0]);
  });

  it('renders drawer variants with close action', () => {
    const { getByText } = render(
      <Drawer open direction="bottom">
        <DrawerTrigger>Open Drawer</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Drawer Title</DrawerTitle>
            <DrawerDescription>Drawer Description</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose>Close Drawer</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );

    expect(getByText('Open Drawer')).toBeInTheDocument();
  });

  it('renders drawer portal/overlay and multiple directions', () => {
    render(
      <>
        <Drawer open direction="left">
          <DrawerContent>
            <DrawerTitle>Left Drawer</DrawerTitle>
          </DrawerContent>
        </Drawer>
        <Drawer open direction="right">
          <DrawerContent>
            <DrawerTitle>Right Drawer</DrawerTitle>
          </DrawerContent>
        </Drawer>
        <Drawer open direction="top">
          <DrawerPortal>
            <DrawerOverlay />
            <DrawerContent>
              <DrawerTitle>Top Drawer</DrawerTitle>
              <DrawerClose>Dismiss</DrawerClose>
            </DrawerContent>
          </DrawerPortal>
        </Drawer>
      </>
    );
  });

  it('renders dropdown and extended items', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open Dropdown</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent forceMount>
            <DropdownMenuGroup>
              <DropdownMenuLabel inset>Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem inset variant="destructive">
                Action
                <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuCheckboxItem checked>Checked</DropdownMenuCheckboxItem>
            <DropdownMenuRadioGroup value="one">
              <DropdownMenuRadioItem value="one">One</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent forceMount>
                <DropdownMenuItem>Nested</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    );
  });

  it('renders menubar with checkbox/radio/sub variants', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Menu</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent forceMount>
              <MenubarGroup>
                <MenubarLabel inset>Section</MenubarLabel>
                <MenubarSeparator />
                <MenubarItem inset variant="destructive">
                  Item
                  <MenubarShortcut>⌘I</MenubarShortcut>
                </MenubarItem>
              </MenubarGroup>
              <MenubarCheckboxItem checked>Pinned</MenubarCheckboxItem>
              <MenubarRadioGroup value="one">
                <MenubarRadioItem value="one">One</MenubarRadioItem>
              </MenubarRadioGroup>
              <MenubarSub>
                <MenubarSubTrigger inset>More</MenubarSubTrigger>
                <MenubarSubContent forceMount>
                  <MenubarItem>Nested</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>
    );
  });

  it('renders sheet header/footer/close variants', () => {
    render(
      <Sheet open>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Sheet Description</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>Close Sheet</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  });

  it('renders sheet with additional side variants', () => {
    render(
      <>
        <Sheet open>
          <SheetContent side="top">
            <SheetTitle>Top Sheet</SheetTitle>
          </SheetContent>
        </Sheet>
        <Sheet open>
          <SheetContent side="bottom">
            <SheetTitle>Bottom Sheet</SheetTitle>
          </SheetContent>
        </Sheet>
        <Sheet open>
          <SheetContent side="right">
            <SheetTitle>Right Sheet</SheetTitle>
            <SheetClose>Close</SheetClose>
          </SheetContent>
        </Sheet>
      </>
    );
  });

  it('renders context menu with sub/radio/checkbox variants', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Context Trigger</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent forceMount>
            <ContextMenuGroup>
              <ContextMenuLabel inset>Context Section</ContextMenuLabel>
              <ContextMenuSeparator />
              <ContextMenuItem inset variant="destructive">
                Remove
                <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
              </ContextMenuItem>
            </ContextMenuGroup>
            <ContextMenuCheckboxItem checked>Enabled</ContextMenuCheckboxItem>
            <ContextMenuRadioGroup value="one">
              <ContextMenuRadioItem value="one">One</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
            <ContextMenuSub>
              <ContextMenuSubTrigger inset>More</ContextMenuSubTrigger>
              <ContextMenuSubContent forceMount>
                <ContextMenuItem>Nested Item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>
    );
  });

  it('renders sonner toaster wrapper', () => {
    render(<Toaster />);
  });

  it('evaluates useIsMobile hook state', async () => {
    const MobileProbe = () => {
      const isMobile = useIsMobile();
      return <span>{isMobile ? 'mobile' : 'desktop'}</span>;
    };

    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 500,
    });

    const { getByText } = render(<MobileProbe />);

    await waitFor(() => {
      expect(getByText('mobile')).toBeInTheDocument();
    });

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('executes menubar wrapper exports directly', () => {
    expect(MenubarPortal({ children: null } as any)).toBeTruthy();
    expect(MenubarTrigger({ children: 'Trigger' } as any)).toBeTruthy();
    expect(MenubarContent({ forceMount: true, children: null } as any)).toBeTruthy();
    expect(MenubarGroup({ children: null } as any)).toBeTruthy();
    expect(MenubarLabel({ children: 'Label', inset: true } as any)).toBeTruthy();
    expect(MenubarItem({ children: 'Item', inset: true, variant: 'destructive' } as any)).toBeTruthy();
    expect(MenubarCheckboxItem({ children: 'Checked', checked: true } as any)).toBeTruthy();
    expect(MenubarRadioGroup({ value: 'one', children: null } as any)).toBeTruthy();
    expect(MenubarRadioItem({ value: 'one', children: 'One' } as any)).toBeTruthy();
    expect(MenubarSeparator({} as any)).toBeTruthy();
    expect(MenubarShortcut({ children: '⌘I' } as any)).toBeTruthy();
    expect(MenubarSub({ children: null } as any)).toBeTruthy();
    expect(MenubarSubTrigger({ children: 'More', inset: true } as any)).toBeTruthy();
    expect(MenubarSubContent({ forceMount: true, children: null } as any)).toBeTruthy();
  });

  it('executes context-menu wrapper exports directly', () => {
    expect(ContextMenuGroup({ children: null } as any)).toBeTruthy();
    expect(ContextMenuPortal({ children: null } as any)).toBeTruthy();
    expect(ContextMenuSub({ children: null } as any)).toBeTruthy();
    expect(ContextMenuRadioGroup({ value: 'one', children: null } as any)).toBeTruthy();
    expect(ContextMenuSubTrigger({ children: 'More', inset: true } as any)).toBeTruthy();
    expect(ContextMenuSubContent({ forceMount: true, children: null } as any)).toBeTruthy();
    expect(ContextMenuContent({ forceMount: true, children: null } as any)).toBeTruthy();
    expect(ContextMenuItem({ children: 'Item', inset: true, variant: 'destructive' } as any)).toBeTruthy();
    expect(ContextMenuCheckboxItem({ children: 'Check', checked: true } as any)).toBeTruthy();
    expect(ContextMenuRadioItem({ value: 'one', children: 'One' } as any)).toBeTruthy();
    expect(ContextMenuLabel({ children: 'Label', inset: true } as any)).toBeTruthy();
    expect(ContextMenuSeparator({} as any)).toBeTruthy();
    expect(ContextMenuShortcut({ children: '⌘⌫' } as any)).toBeTruthy();
  });
});
