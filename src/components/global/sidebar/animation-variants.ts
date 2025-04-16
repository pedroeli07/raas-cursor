// Animation variants used in the sidebar for Framer Motion animations

// Sidebar width transitions
export const sidebarVariants = {
  collapsed: { width: "64px" },
  expanded: { width: "240px" },
};

// Mobile sidebar variants
export const mobileSidebarVariants = {
  closed: { 
    x: "-100%",
    boxShadow: "0px 0px 0px rgba(0, 0, 0, 0)" 
  },
  open: { 
    x: "0%",
    boxShadow: "5px 0px 25px rgba(0, 0, 0, 0.1)" 
  },
};

// Mobile backdrop variants
export const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// Item opacity and position transitions
export const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

// Sub-menu expansion/collapse animations
export const subMenuVariants = {
  hidden: { height: 0, opacity: 0 },
  visible: { 
    height: 'auto', 
    opacity: 1,
    transition: {
      height: { duration: 0.3 },
      opacity: { duration: 0.2, delay: 0.1 }
    }
  }
};

// Dropdown menu animations
export const dropdownVariants = {
  closed: { 
    height: 0, 
    opacity: 0,
    transition: {
      height: { duration: 0.3 },
      opacity: { duration: 0.2 }
    }
  },
  open: { 
    height: 'auto', 
    opacity: 1,
    transition: {
      height: { duration: 0.3 },
      opacity: { duration: 0.2, delay: 0.1 }
    }
  }
}; 