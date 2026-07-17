import re
import os
import glob

def fix_classes(content):
    # Fix massive paddings
    content = re.sub(r'(?<![a-zA-Z:-])p-24\b', 'p-6 md:p-12 lg:p-24', content)
    content = re.sub(r'(?<![a-zA-Z:-])p-20\b', 'p-6 md:p-10 lg:p-20', content)
    content = re.sub(r'(?<![a-zA-Z:-])p-16\b', 'p-6 md:p-10 lg:p-16', content)
    content = re.sub(r'(?<![a-zA-Z:-])p-12\b', 'p-6 md:p-12', content)
    content = re.sub(r'(?<![a-zA-Z:-])px-12\b', 'px-6 md:px-12', content)
    content = re.sub(r'(?<![a-zA-Z:-])py-12\b', 'py-6 md:py-12', content)
    content = re.sub(r'(?<![a-zA-Z:-])py-24\b', 'py-8 md:py-24', content)

    # Fix grids where they are not already prefixed
    content = re.sub(r'(?<![a-zA-Z:-])grid-cols-2\b', 'grid-cols-1 sm:grid-cols-2', content)
    content = re.sub(r'(?<![a-zA-Z:-])grid-cols-3\b', 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', content)
    content = re.sub(r'(?<![a-zA-Z:-])grid-cols-4\b', 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4', content)
    content = re.sub(r'(?<![a-zA-Z:-])grid-cols-5\b', 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-5', content)
    content = re.sub(r'(?<![a-zA-Z:-])grid-cols-6\b', 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-6', content)

    # Fix massive radii
    content = re.sub(r'rounded-\[4rem\]', 'rounded-[2rem] md:rounded-[4rem]', content)
    content = re.sub(r'rounded-\[3.5rem\]', 'rounded-[2rem] md:rounded-[3.5rem]', content)
    content = re.sub(r'rounded-\[3rem\]', 'rounded-[1.5rem] md:rounded-[3rem]', content)
    
    # Fix flex items-center without flex-col
    # This is trickier because sometimes we want flex items in a row even on mobile.
    # Instead, we just replace gap-12 or gap-8 or gap-16 to have mobile fallback
    content = re.sub(r'(?<![a-zA-Z:-])gap-16\b', 'gap-8 md:gap-16', content)
    content = re.sub(r'(?<![a-zA-Z:-])gap-12\b', 'gap-6 md:gap-12', content)
    content = re.sub(r'(?<![a-zA-Z:-])gap-20\b', 'gap-8 md:gap-20', content)

    # Fix w-96 to responsive width
    content = re.sub(r'(?<![a-zA-Z:-])w-96\b', 'w-full md:w-96', content)
    content = re.sub(r'(?<![a-zA-Z:-])w-80\b', 'w-full sm:w-80', content)
    
    # Fix text sizes
    content = re.sub(r'(?<![a-zA-Z:-])text-5xl\b', 'text-4xl md:text-5xl', content)
    content = re.sub(r'(?<![a-zA-Z:-])text-6xl\b', 'text-4xl md:text-6xl', content)

    # Avoid duplicate prefixes if they accidentally formed, like sm:grid-cols-1 sm:grid-cols-2
    # But our negative lookbehind (?<![a-zA-Z:-]) prevents matching md:grid-cols-2.

    return content

files_to_update = [
    'pages/Dashboard.tsx',
    'pages/Explore.tsx',
    'pages/ProfileView.tsx',
    'pages/Settings.tsx',
    'pages/Workplace.tsx',
    'pages/ProductManagement.tsx',
    'pages/AnalyticsDashboard.tsx',
    'pages/ListProductFlow.tsx',
    'pages/PricingPage.tsx',
    'pages/Search.tsx',
    'pages/Notifications.tsx',
    'pages/Inbox.tsx'
]

for filepath in files_to_update:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = fix_classes(content)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
        else:
            print(f"No changes needed in {filepath}")
    else:
        print(f"File not found: {filepath}")
